package com.attest.attest.service;

import com.attest.attest.exception.UnsupportedSignatureSchemeException;
import com.attest.attest.exception.ZkLoginVerificationUnavailableException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.bouncycastle.crypto.digests.Blake2bDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Verifies that a Sui "personal message" signature was produced by the address
 * it claims to be from, for exactly one purpose: wallet-native login (see
 * WalletAuthService). This is the single place in the backend that trusts a
 * claimed Sui address — every other place in the codebase, everything else
 * about a user's identity flows from here.
 *
 * <p>Sui's wallet-signature format is a base64 "serialized signature":
 * {@code [1-byte scheme flag][signature bytes][public key bytes]}. Two schemes
 * are supported:
 *
 * <ul>
 *   <li><b>Ed25519</b> (flag 0, e.g. the Slush wallet) — verified entirely
 *       locally. Sui's personal-message signing scheme wraps the message in a
 *       3-byte intent header + a BCS-encoded byte vector, hashes that with
 *       BLAKE2b-256, and signs the digest with Ed25519. Every byte of this was
 *       confirmed against the installed {@code @mysten/sui} SDK's own source
 *       (intent.mjs, publickey.mjs, bcs.mjs) and cross-checked against a real
 *       signature it generated, rather than assumed from memory.</li>
 *   <li><b>zkLogin</b> (flag 5, Google via Enoki) — NOT verified locally.
 *       Validating a zkLogin signature means validating a Groth16 proof
 *       against the current epoch's OAuth JWKs, which is exactly what Sui's
 *       own {@code @mysten/sui} SDK does by calling out to a full node rather
 *       than doing it in-process (confirmed by reading zklogin/publickey.mjs
 *       — {@code graphqlVerifyZkLoginSignature} is a thin wrapper over a
 *       network call). Sui's public testnet infrastructure has since retired
 *       both JSON-RPC ("has been deprecated") and the public GraphQL endpoint
 *       (returns a gateway-level fault) for this method — only gRPC still
 *       answers it, confirmed by calling
 *       {@code SuiGrpcClient.core.verifyZkLoginSignature} directly. Rather
 *       than hand-roll gRPC/protobuf in Java for one call, this class posts to
 *       a small Next.js route ({@code frontend/src/app/api/verify-zklogin})
 *       that makes that exact SDK call — reusing code already proven to work,
 *       instead of a second, independently-maintained implementation of it.
 *       Zero cryptography is hand-rolled for this scheme either way.</li>
 * </ul>
 */
@Service
public class SuiSignatureVerifier {

    private static final byte INTENT_SCOPE_PERSONAL_MESSAGE = 3;
    private static final byte INTENT_VERSION_V0 = 0;
    private static final byte APP_ID_SUI = 0;

    private static final int FLAG_ED25519 = 0;
    private static final int FLAG_ZKLOGIN = 5;

    private static final int ED25519_SIGNATURE_LENGTH = 64;
    private static final int ED25519_PUBLIC_KEY_LENGTH = 32;

    // The fixed 12-byte X.509 SubjectPublicKeyInfo prefix for a raw Ed25519 key
    // (RFC 8410, OID 1.3.101.112) — confirmed by generating a real Ed25519 key
    // with the JDK and diffing its own X.509 encoding against this constant.
    private static final byte[] ED25519_X509_PREFIX = HexFormat.of().parseHex("302a300506032b6570032100");

    private final String zkLoginVerifyUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SuiSignatureVerifier(@Value("${app.sui.zklogin-verify-url}") String zkLoginVerifyUrl) {
        this.zkLoginVerifyUrl = zkLoginVerifyUrl;
        // Explicit HTTP/1.1: the JDK HttpClient's default HTTP_2 setting still
        // attempts an h2c upgrade over plaintext, which Next.js's dev server
        // doesn't handle — it accepts the connection, then closes it with zero
        // bytes back (IOException: "header parser received no bytes", caused by
        // an EOFException). Confirmed by reproducing this in isolation: the
        // identical request succeeds immediately once the version is pinned.
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Whether {@code serializedSignatureB64} is a valid Sui personal-message
     * signature over {@code message}, produced by {@code claimedAddress}.
     *
     * @throws UnsupportedSignatureSchemeException     the signature uses a scheme other than Ed25519 or zkLogin
     * @throws ZkLoginVerificationUnavailableException a zkLogin signature could not be checked (network/endpoint issue) — never treated as success
     */
    public boolean verifyPersonalMessage(byte[] message, String serializedSignatureB64, String claimedAddress) {
        byte[] sig;
        try {
            sig = Base64.getDecoder().decode(serializedSignatureB64);
        } catch (IllegalArgumentException notBase64) {
            return false;
        }
        if (sig.length == 0) {
            return false;
        }

        int flag = sig[0] & 0xFF;
        return switch (flag) {
            case FLAG_ED25519 -> verifyEd25519(message, sig, claimedAddress);
            case FLAG_ZKLOGIN -> verifyZkLogin(message, serializedSignatureB64, claimedAddress);
            default -> throw new UnsupportedSignatureSchemeException(flag);
        };
    }

    // --- Ed25519: fully local ---------------------------------------------

    private boolean verifyEd25519(byte[] message, byte[] serializedSignature, String claimedAddress) {
        int expectedLength = 1 + ED25519_SIGNATURE_LENGTH + ED25519_PUBLIC_KEY_LENGTH;
        if (serializedSignature.length != expectedLength) {
            return false;
        }
        byte[] signatureBytes = Arrays.copyOfRange(serializedSignature, 1, 1 + ED25519_SIGNATURE_LENGTH);
        byte[] publicKeyBytes = Arrays.copyOfRange(serializedSignature, 1 + ED25519_SIGNATURE_LENGTH, expectedLength);

        byte[] digest = personalMessageDigest(message);

        if (!ed25519Verify(publicKeyBytes, digest, signatureBytes)) {
            return false;
        }
        String derivedAddress = suiAddressFromFlaggedPublicKey(FLAG_ED25519, publicKeyBytes);
        return derivedAddress.equalsIgnoreCase(claimedAddress);
    }

    /**
     * {@code BLAKE2b-256( [scope=3][version=0][appId=0] ++ bcs_byte_vector(message) )}
     * — Sui's "personal message" intent-wrapping, reproduced from
     * {@code @mysten/sui}'s {@code messageWithIntent}/{@code verifyPersonalMessage}.
     */
    private byte[] personalMessageDigest(byte[] message) {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        buffer.write(INTENT_SCOPE_PERSONAL_MESSAGE);
        buffer.write(INTENT_VERSION_V0);
        buffer.write(APP_ID_SUI);
        writeUleb128(buffer, message.length);
        buffer.writeBytes(message);

        Blake2bDigest blake2b256 = new Blake2bDigest(256);
        byte[] input = buffer.toByteArray();
        blake2b256.update(input, 0, input.length);
        byte[] digest = new byte[blake2b256.getDigestSize()];
        blake2b256.doFinal(digest, 0);
        return digest;
    }

    private static void writeUleb128(ByteArrayOutputStream out, int value) {
        // BCS uses ULEB128 for vector length prefixes. Every message this backend
        // signs is well under 2^31 bytes, so a plain int is more than enough range.
        while (true) {
            int sevenBits = value & 0x7F;
            value >>>= 7;
            if (value == 0) {
                out.write(sevenBits);
                return;
            }
            out.write(sevenBits | 0x80);
        }
    }

    private boolean ed25519Verify(byte[] publicKeyBytes, byte[] data, byte[] signatureBytes) {
        try {
            byte[] x509 = new byte[ED25519_X509_PREFIX.length + publicKeyBytes.length];
            System.arraycopy(ED25519_X509_PREFIX, 0, x509, 0, ED25519_X509_PREFIX.length);
            System.arraycopy(publicKeyBytes, 0, x509, ED25519_X509_PREFIX.length, publicKeyBytes.length);

            PublicKey publicKey = KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(x509));
            Signature verifier = Signature.getInstance("Ed25519");
            verifier.initVerify(publicKey);
            verifier.update(data);
            return verifier.verify(signatureBytes);
        } catch (Exception malformedKeyOrSignature) {
            // A malformed public key or signature is exactly as invalid as a
            // cryptographic mismatch — fail closed rather than propagate.
            return false;
        }
    }

    /**
     * {@code toSuiAddress()}: {@code hex( BLAKE2b-256([flag] ++ rawPublicKeyBytes) )},
     * first 32 bytes, "0x"-prefixed. Reproduced from {@code @mysten/sui}'s
     * {@code PublicKey.toSuiAddress()}.
     */
    private String suiAddressFromFlaggedPublicKey(int schemeFlag, byte[] rawPublicKeyBytes) {
        byte[] flagged = new byte[1 + rawPublicKeyBytes.length];
        flagged[0] = (byte) schemeFlag;
        System.arraycopy(rawPublicKeyBytes, 0, flagged, 1, rawPublicKeyBytes.length);

        Blake2bDigest blake2b256 = new Blake2bDigest(256);
        blake2b256.update(flagged, 0, flagged.length);
        byte[] digest = new byte[blake2b256.getDigestSize()];
        blake2b256.doFinal(digest, 0);

        return "0x" + HexFormat.of().formatHex(digest);
    }

    // --- zkLogin: delegated to the frontend's proven gRPC call ------------

    private boolean verifyZkLogin(byte[] message, String serializedSignatureB64, String claimedAddress) {
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("bytes", Base64.getEncoder().encodeToString(message));
        requestBody.put("signature", serializedSignatureB64);
        requestBody.put("address", claimedAddress);

        HttpRequest request;
        HttpResponse<String> response;
        try {
            request = HttpRequest.newBuilder(URI.create(zkLoginVerifyUrl))
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                    .build();
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException networkFailure) {
            throw new ZkLoginVerificationUnavailableException(
                    "Could not reach the zkLogin verification endpoint", networkFailure);
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new ZkLoginVerificationUnavailableException(
                    "Interrupted while verifying a zkLogin signature", interrupted);
        }

        JsonNode root;
        try {
            root = objectMapper.readTree(response.body());
        } catch (IOException malformedJson) {
            throw new ZkLoginVerificationUnavailableException(
                    "Malformed response from the zkLogin verification endpoint", malformedJson);
        }

        // A non-2xx here means the underlying gRPC call itself threw — either a
        // transport/environmental problem, or a signature too malformed even to
        // parse (see route.ts). Either way, never treat it as valid: it fails
        // exactly like an environmental failure, and a real user's genuine
        // sign-in never produces malformed BCS in the first place.
        if (response.statusCode() != 200) {
            String detail = root.path("error").asText(null);
            throw new ZkLoginVerificationUnavailableException(
                    "zkLogin verification endpoint returned HTTP " + response.statusCode()
                            + (detail != null ? ": " + detail : ""));
        }

        JsonNode success = root.path("success");
        return success.isBoolean() && success.asBoolean();
    }
}
