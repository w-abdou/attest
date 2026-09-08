package com.attest.attest.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "document_signers",
        uniqueConstraints = @UniqueConstraint(columnNames = {"documentId", "userId"}))
@Getter
@Setter
@NoArgsConstructor
public class DocumentSigner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Points at a specific Document row (one immutable version), not the family.
    @Column(nullable = false)
    private Long documentId;

    @Column(nullable = false)
    private Long userId;
}