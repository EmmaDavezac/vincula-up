export function emptyServiceRequest(partial) {
    return {
        id: partial?.id ?? '',
        clienteId: partial?.clienteId,
        professionalId: partial?.professionalId ?? '',
        professionalName: partial?.professionalName ?? '',
        specialty: partial?.specialty ?? '',
        date: partial?.date ?? '',
        time: partial?.time ?? '',
        timeEnd: partial?.timeEnd ?? '',
        address: partial?.address ?? '',
        latitude: partial?.latitude ?? null,
        longitude: partial?.longitude ?? null,
        status: partial?.status ?? 'PENDIENTE',
        motivoCancelacion: partial?.motivoCancelacion,
        canceladaPorRol: partial?.canceladaPorRol,
        description: partial?.description ?? '',
        calificacion: partial?.calificacion,
        distanciaMetros: partial?.distanciaMetros,
        especialidadId: partial?.especialidadId,
        fechaCreacion: partial?.fechaCreacion,
        fechaCambioEstado: partial?.fechaCambioEstado,
    };
}
