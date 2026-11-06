import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';

@Directive({
	selector: '[vuChatAutoScroll]',
	standalone: true,
})
export class ChatAutoScrollDirective implements AfterViewInit, OnDestroy {
	private readonly element = inject(ElementRef<HTMLElement>);
	private observer?: MutationObserver;
	private frame = 0;

	ngAfterViewInit(): void {
		this.observer = new MutationObserver(() => this.scheduleScroll());
		this.observer.observe(this.element.nativeElement, { childList: true, subtree: true });
		this.scheduleScroll();
	}

	ngOnDestroy(): void {
		this.observer?.disconnect();
		cancelAnimationFrame(this.frame);
	}

	private scheduleScroll(): void {
		cancelAnimationFrame(this.frame);
		this.frame = requestAnimationFrame(() => {
			const container = this.element.nativeElement;
			container.scrollTop = container.scrollHeight;
		});
	}
}