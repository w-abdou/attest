package com.attest.attest.storage;

import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public interface DocumentStorageService {
    String store(MultipartFile file) throws IOException;
    byte[] retrieve(String reference) throws IOException;
}
