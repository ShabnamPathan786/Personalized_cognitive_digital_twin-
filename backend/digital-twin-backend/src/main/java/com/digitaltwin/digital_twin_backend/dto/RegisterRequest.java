package com.digitaltwin.digital_twin_backend.dto;
import com.digitaltwin.digital_twin_backend.model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {
    @NotBlank(message="username is required")
    @Size(min=3,max=50 ,message ="username must be between 3 and 50 characters ")
    @Pattern(regexp="^[a-zA-Z0-9_-]{3,20}$",message="Username can only contain letters, numbers, underscore and hyphen")
    private String username;


    @NotBlank(message="Email is required")
    @Email(message="Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 100, message = "Password must be at least 8 characters")
    @Pattern(
            regexp = "^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).*$",
            message = "Password must contain at least one digit, one lowercase, one uppercase, and one special character"
    )
    private String password;





private User.UserType  userType=User.UserType.NORMAL;
}
