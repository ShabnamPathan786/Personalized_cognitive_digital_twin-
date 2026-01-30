package com.digitaltwin.digital_twin_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse<T> {
    private boolean success;
    private String message;
    private T data;
    private LocalDateTime timeStamp;


    public static<T> ApiResponse<T> success(String message){
        return new ApiResponse<>(true,message,null,LocalDateTime.now());
    }

    public static<T> ApiResponse<T> success(String message,T data){
        return new ApiResponse<>(true,message,data,LocalDateTime.now());

    }

    public static<T> ApiResponse<T> error(String message){
        return new ApiResponse<>(false,message,null,LocalDateTime.now());

    }
    public static<T> ApiResponse<T> error(String message,T data){
        return new ApiResponse<>(false,message,data,LocalDateTime.now());

    }





}
