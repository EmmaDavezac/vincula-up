import { Injectable } from '@angular/core';
import { Observable, Subject, filter, interval, map, merge } from 'rxjs';

export type DataCollection = 'requests' | 'clients' | 'professionals' | 'categories';

@Injectable({ providedIn: 'root' })
export class DataRefreshService {
	private readonly changes = new Subject<DataCollection>();

	notifyChanged(...collections: DataCollection[]): void {
		for (const collection of collections) {
			this.changes.next(collection);
		}
	}

	watch(collections: readonly DataCollection[]): Observable<void> {
		return merge(
			interval(30_000),
			this.changes.pipe(filter((collection) => collections.includes(collection))),
		).pipe(map(() => undefined));
	}
}
