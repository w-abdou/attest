package com.attest.attest.storage;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class LocalDiskStorageService implements DocumentStorageService {

    @Value("${app.storage.local-path}")
    private String basePath;

    @Override
    public String store(MultipartFile file) throws IOException {
        Path dir = Path.of(basePath).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        String originalName = file.getOriginalFilename() == null ? "document.pdf" : file.getOriginalFilename();
        String safeName;
        try {
            safeName = Path.of(originalName).getFileName().toString().replaceAll("[^a-zA-Z0-9._-]", "_");
        } catch (InvalidPathException ex) {
            throw new IOException("Invalid filename", ex);
        }
        if (safeName.isBlank() || safeName.equals(".") || safeName.equals("..")) {
            safeName = "document.pdf";
        }
        Path target = dir.resolve(UUID.randomUUID() + "-" + safeName).normalize();
        if (!target.startsWith(dir)) {
            throw new IOException("Invalid storage path");
        }
        file.transferTo(target);

        return target.toString();
    }

    @Override
    public byte[] retrieve(String reference) throws IOException {
        Path dir = Path.of(basePath).toAbsolutePath().normalize();
        Path target = Path.of(reference).toAbsolutePath().normalize();
        if (!target.startsWith(dir)) {
            throw new IOException("Invalid storage reference");
        }
        return Files.readAllBytes(target);
    }
}
