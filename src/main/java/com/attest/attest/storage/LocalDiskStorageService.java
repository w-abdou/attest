package com.attest.attest.storage;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Service
public class LocalDiskStorageService implements DocumentStorageService {

    @Value("${app.storage.local-path}")
    private String basePath;

    @Override
    public String store(MultipartFile file) throws IOException {
        Path dir = Path.of(basePath);
        Files.createDirectories(dir);

        String storedName = UUID.randomUUID() + "-" + file.getOriginalFilename();
        Path target = dir.resolve(storedName);
        file.transferTo(target);

        return target.toString();
    }

    @Override
    public byte[] retrieve(String reference) throws IOException {
        return Files.readAllBytes(Path.of(reference));
    }
}
