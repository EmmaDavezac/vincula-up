package com.vinculaup.bff_web.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequest;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * {@link ClientHttpRequestFactory} basada en {@link HttpClient} (JDK 21).
 * <p>
 * Sustituye a {@link org.springframework.http.client.SimpleClientHttpRequestFactory}, que usa
 * {@link java.net.HttpURLConnection} bajo el hood y en este JDK rechaza el método PATCH con
 * {@code ProtocolException: Invalid HTTP method: PATCH}, rompiendo todas las peticiones PATCH del
 * BFF hacia los microservicios (p. ej. {@code PATCH /usuarios/{id}/terminos} en ms-usuarios).
 * {@link HttpClient} soporta cualquier método HTTP sin dependencias externas.
 * <p>
 * Reenvía el encabezado {@code Authorization} (JWT de Keycloak) de la petición entrante hacia el
 * microservicio destino, preservando el comportamiento anterior de las fábricas por cliente.
 */
@Component
public class JdkHttpClientRequestFactory implements ClientHttpRequestFactory {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Override
    public ClientHttpRequest createRequest(URI url, HttpMethod method) throws IOException {
        return new JdkHttpClientRequest(url, method, httpClient, authorizationHeaders());
    }

    private HttpHeaders authorizationHeaders() {
        HttpHeaders headers = new HttpHeaders();
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            String auth = attrs.getRequest().getHeader(HttpHeaders.AUTHORIZATION);
            if (auth != null && !auth.isBlank()) {
                headers.add(HttpHeaders.AUTHORIZATION, auth);
            }
        }
        return headers;
    }

    /* ─── implementación de la petición ─── */

    private static class JdkHttpClientRequest implements ClientHttpRequest {

        private final URI uri;
        private final HttpMethod method;
        private final HttpClient httpClient;
        private final HttpHeaders headers;
        private java.io.ByteArrayOutputStream bufferedBody;
        private boolean executed;
        private final Map<String, Object> attributes = new HashMap<>();

        JdkHttpClientRequest(URI uri, HttpMethod method, HttpClient httpClient, HttpHeaders headers) {
            this.uri = uri;
            this.method = method;
            this.httpClient = httpClient;
            this.headers = headers != null ? headers : new HttpHeaders();
        }

        @Override
        public HttpMethod getMethod() {
            return method;
        }

        @Override
        public URI getURI() {
            return uri;
        }

        @Override
        public HttpHeaders getHeaders() {
            return headers;
        }

        @Override
        public OutputStream getBody() throws IOException {
            if (executed) {
                throw new IllegalStateException("La solicitud ya se ejecutó");
            }
            if (bufferedBody == null) {
                bufferedBody = new java.io.ByteArrayOutputStream();
            }
            return bufferedBody;
        }

        @Override
        public Map<String, Object> getAttributes() {
            return attributes;
        }

        @Override
        public ClientHttpResponse execute() throws IOException {
            executed = true;
            byte[] body = bufferedBody != null ? bufferedBody.toByteArray() : new byte[0];

            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(uri)
                    .timeout(Duration.ofSeconds(30))
                    .method(method.name(),
                            body.length > 0
                                    ? java.net.http.HttpRequest.BodyPublishers.ofByteArray(body)
                                    : java.net.http.HttpRequest.BodyPublishers.noBody());

            headers.forEach((name, values) -> {
                for (String value : values) {
                    builder.header(name, value);
                }
            });

            try {
                HttpResponse<InputStream> upstream = httpClient.send(builder.build(),
                        HttpResponse.BodyHandlers.ofInputStream());
                return new JdkHttpClientResponse(upstream);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                throw new IOException("La solicitud HTTP fue interrumpida", ex);
            }
        }
    }

    /* ─── implementación de la respuesta ─── */

    private static class JdkHttpClientResponse implements ClientHttpResponse {

        private final HttpResponse<InputStream> upstream;

        JdkHttpClientResponse(HttpResponse<InputStream> upstream) {
            this.upstream = upstream;
        }

        @Override
        public HttpStatusCode getStatusCode() throws IOException {
            try {
                return HttpStatus.valueOf(upstream.statusCode());
            } catch (IllegalArgumentException ex) {
                return HttpStatus.INTERNAL_SERVER_ERROR;
            }
        }

        @Override
        public String getStatusText() throws IOException {
            return "";
        }

        @Override
        public HttpHeaders getHeaders() {
            HttpHeaders headers = new HttpHeaders();
            upstream.headers().map().forEach((name, values) ->
                    values.forEach(value -> headers.add(name, value)));
            return headers;
        }

        @Override
        public InputStream getBody() throws IOException {
            return upstream.body();
        }

        @Override
        public void close() {
            try {
                upstream.body().close();
            } catch (Exception ignored) {
            }
        }
    }
}

