package com.campusmaster.campusmaster.security;

import com.campusmaster.campusmaster.entity.Role;
import com.campusmaster.campusmaster.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.Collection;
import java.util.List;

@AllArgsConstructor
@Getter
public class UserDetailsImpl implements UserDetails {

    private final Long id;
    private final String name;
    private final String email;
    @JsonIgnore
    private final String password;
    private final Role role;
    private final boolean isVerified;
    private final Collection<? extends GrantedAuthority> authorities;

    public static UserDetailsImpl build(User user) {
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return new UserDetailsImpl(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getPassword(),
            user.getRole(),
            user.isVerified(),
            authorities
        );
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return isVerified;
    }
}
