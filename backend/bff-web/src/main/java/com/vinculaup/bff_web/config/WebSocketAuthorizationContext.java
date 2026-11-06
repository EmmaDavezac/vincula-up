package com.vinculaup.bff_web.config;

import java.util.function.Supplier;
import org.springframework.stereotype.Component;

@Component
public class WebSocketAuthorizationContext {

    private final ThreadLocal<String> authorization = new ThreadLocal<>();

    public String currentAuthorization() {
        return authorization.get();
    }

    public <T> T withAuthorization(String value, Supplier<T> action) {
        String previous = authorization.get();
        authorization.set(value);
        try {
            return action.get();
        } finally {
            if (previous == null) {
                authorization.remove();
            } else {
                authorization.set(previous);
            }
        }
    }
}