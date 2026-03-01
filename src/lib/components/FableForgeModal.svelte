<script lang="ts">
	import { ExternalLink, Rocket, Download } from 'lucide-svelte';
	import Modal from './Modal.svelte';

	let {
		open = $bindable(false),
		characterId,
		registryUrl
	}: {
		open?: boolean;
		characterId: string;
		registryUrl?: string;
	} = $props();

	let launched = $state(false);
	let failed = $state(false);

	$effect(() => {
		if (open) {
			launched = false;
			failed = false;
			// Slight delay so modal appears first, then we try the custom protocol
			const timer = setTimeout(() => {
				tryOpenFableForge();
			}, 600);
			return () => clearTimeout(timer);
		}
	});

	function tryOpenFableForge() {
		const params = new URLSearchParams({ id: characterId });
		if (registryUrl) params.set('registry', registryUrl);
		const url = `fableforge://character?${params.toString()}`;

		// We can't detect whether the app is installed reliably; attempt the redirect
		// and show the download hint after a short timeout (app would have opened).
		window.location.href = url;
		launched = true;

		// After 2 s, if still here the app likely isn't installed or opened
		setTimeout(() => {
			failed = true;
		}, 2000);
	}
</script>

<Modal bind:open title="Apri in FableForge">
	<div class="space-y-6 py-2">
		<!-- Animated icon -->
		<div class="flex flex-col items-center gap-3 py-4">
			<div
				class="size-16 rounded-2xl flex items-center justify-center
				       bg-brand-indigo/10 shadow-inner"
			>
				<Rocket
					class="size-8 text-brand-indigo {launched && !failed
						? 'animate-bounce'
						: ''}"
				/>
			</div>

			{#if !launched}
				<p class="text-sm font-semibold text-center">Tentativo di apertura in corso…</p>
				<p class="text-xs text-muted-foreground text-center">
					Avvio dell'applicazione FableForge.
				</p>
			{:else if !failed}
				<p class="text-sm font-semibold text-center">Apertura in corso…</p>
				<p class="text-xs text-muted-foreground text-center">
					Se FableForge non si apre controlla la barra delle applicazioni.
				</p>
			{:else}
				<p class="text-sm font-semibold text-center">FableForge non trovato?</p>
				<p class="text-xs text-muted-foreground text-center">
					Sembra che FableForge non sia installato su questo dispositivo.
				</p>
			{/if}
		</div>

		<!-- Download hint (always shown once launched) -->
		{#if launched}
			<div class="glass-panel rounded-[16px] p-4 space-y-2">
				<div class="flex items-center gap-2 text-xs font-semibold">
					<Download class="size-3.5 text-brand-indigo" />
					<span>Non hai FableForge?</span>
				</div>
				<p class="text-xs text-muted-foreground">
					Scarica l'applicazione desktop dal sito ufficiale per gestire i tuoi personaggi.
				</p>
				<a
					href="https://fableworld.github.io"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-indigo
					       hover:underline"
				>
					fableworld.github.io
					<ExternalLink class="size-3" />
				</a>
			</div>
		{/if}

		<!-- Try again / retry link -->
		{#if failed}
			<div class="text-center">
				<button
					class="text-xs text-muted-foreground hover:text-brand-indigo underline transition-colors"
					onclick={tryOpenFableForge}
				>
					Riprova ad aprire FableForge
				</button>
			</div>
		{/if}
	</div>
</Modal>
