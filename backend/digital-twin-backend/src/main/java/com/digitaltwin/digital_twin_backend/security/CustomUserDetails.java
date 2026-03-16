package com.digitaltwin.digital_twin_backend.security;

import com.digitaltwin.digital_twin_backend.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Data
@AllArgsConstructor
public class CustomUserDetails implements UserDetails {
    private String id;
    private String username;
    private String email;
    private String password;
    private User.UserType userType;
    private boolean active;
    private boolean emailVerified;


public CustomUserDetails(User user){
    this.id=user.getId();
    this.username=user.getUsername();
    this.email=user.getEmail();
    this.password=user.getPassword();
    this.userType=user.getUserType();
    this.active=user.isActive();
    this.emailVerified=user.isEmailVerified();
}

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        // Assign role based on user type
        String role = "ROLE_" + userType.name();
        return Collections.singletonList(new SimpleGrantedAuthority(role));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return active;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }


}
