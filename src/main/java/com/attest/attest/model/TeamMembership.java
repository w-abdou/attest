package com.attest.attest.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Entity
@Table(name = "team_memberships",
        uniqueConstraints = @UniqueConstraint(columnNames = {"teamId", "userId"}))
@Getter
@Setter
@NoArgsConstructor
public class TeamMembership {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long teamId;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TeamRole teamRole;

    @Column(nullable = false)
    private Instant joinedAt = Instant.now();
}