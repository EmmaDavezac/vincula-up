import { Injectable, signal } from '@angular/core';
import { defer, finalize, Observable } from 'rxjs';

export interface OperationProgress {
	id: number;
	message: string;
	detail: string;
}

@Injectable({ providedIn: 'root' })
export class OperationFeedbackService {
	readonly current = signal<OperationProgress | null>(null);
	private readonly active = new Map<number, OperationProgress>();
	private sequence = 0;

	begin(message: string, detail = 'Estamos procesando la operación. Por favor, esperá.'): () => void {
		const operation = { id: ++this.sequence, message, detail };
		this.active.set(operation.id, operation);
		this.updateCurrent();
		let finished = false;

		return () => {
			if (finished) return;
			finished = true;
			this.active.delete(operation.id);
			this.updateCurrent();
		};
	}

	track<T>(
		message: string,
		request: Observable<T>,
		detail?: string,
	): Observable<T> {
		return defer(() => {
			const finish = this.begin(message, detail);
			return request.pipe(finalize(finish));
		});
	}

	private updateCurrent(): void {
		const latest = [...this.active.values()].at(-1) ?? null;
		this.current.set(latest);
	}
}
