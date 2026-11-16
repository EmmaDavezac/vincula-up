package com.vinculaup.bff_web.controller;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

final class SolicitudPrivacyFilter {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private SolicitudPrivacyFilter() {
    }

    static JsonNode aplicar(JsonNode solicitudes, String role) {
        if (!"PROFESIONAL".equals(role) || solicitudes == null || !solicitudes.isArray()) {
            return solicitudes;
        }

        var resultado = MAPPER.createArrayNode();
        for (JsonNode solicitud : solicitudes) {
            ObjectNode copia = MAPPER.createObjectNode();
            copia.setAll((ObjectNode) solicitud);

            if ("PENDIENTE".equalsIgnoreCase(copia.path("estado").asText(""))) {
                String zona = copia.path("zonaAproximada").asText(null);
                if (zona != null && !zona.isBlank()) {
                    copia.put("direccionServicio", zona);
                } else {
                    copia.remove("direccionServicio");
                }
                redondearCoordenada(copia, "latitud");
                redondearCoordenada(copia, "longitud");
            }
            resultado.add(copia);
        }
        return resultado;
    }

    private static void redondearCoordenada(ObjectNode nodo, String campo) {
        var valor = nodo.get(campo);
        if (valor != null && valor.isNumber()) {
            nodo.put(campo, Math.round(valor.asDouble() * 100.0) / 100.0);
        }
    }
}
