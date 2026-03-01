<script lang="ts">
	import type { AudioTrack } from '$lib/schemas';
	import { Play, Pause, Music2 } from 'lucide-svelte';

	let {
		tracks = [],
		fallbackUrl = undefined,
		fallbackLabel = 'Preview'
	}: {
		tracks?: AudioTrack[];
		fallbackUrl?: string;
		fallbackLabel?: string;
	} = $props();

	// Normalise: if no tracks given but a fallback URL exists, treat it as one track
	const allTracks = $derived(
		tracks.length > 0
			? tracks
			: fallbackUrl
				? [{ title: fallbackLabel, url: fallbackUrl }]
				: []
	);

	// Reactive state per track
	let playingIndex = $state<number | null>(null);
	let progresses = $state<number[]>([]);
	let durations = $state<number[]>([]);
	let audioEls = $state<(HTMLAudioElement | null)[]>([]);

	$effect(() => {
		const len = allTracks.length;
		if (progresses.length !== len) progresses = Array(len).fill(0);
		if (durations.length !== len) durations = Array(len).fill(0);
		if (audioEls.length !== len) audioEls = Array(len).fill(null);
	});

	function togglePlay(i: number) {
		const el = audioEls[i];
		if (!el) return;

		if (playingIndex === i) {
			// Pause current
			el.pause();
			playingIndex = null;
		} else {
			// Stop previously playing track
			if (playingIndex !== null && audioEls[playingIndex]) {
				audioEls[playingIndex]!.pause();
				audioEls[playingIndex]!.currentTime = 0;
				progresses[playingIndex] = 0;
			}
			playingIndex = i;
			el.play();
		}
	}

	function onTimeUpdate(i: number, el: HTMLAudioElement) {
		progresses[i] = el.duration > 0 ? el.currentTime / el.duration : 0;
	}

	function onLoadedMetadata(i: number, el: HTMLAudioElement) {
		durations[i] = el.duration;
	}

	function onEnded(i: number) {
		progresses[i] = 0;
		playingIndex = null;
	}

	function seek(i: number, e: MouseEvent) {
		const el = audioEls[i];
		if (!el || !el.duration) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const ratio = (e.clientX - rect.left) / rect.width;
		el.currentTime = ratio * el.duration;
	}

	function formatTime(secs: number): string {
		if (!secs || isNaN(secs)) return '--:--';
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}
</script>

{#if allTracks.length === 0}
	<!-- nothing to show -->
{:else}
	<div class="space-y-2">
		{#each allTracks as track, i}
			<!-- hidden audio element -->
			<audio
				bind:this={audioEls[i]}
				src={track.url}
				ontimeupdate={() => audioEls[i] && onTimeUpdate(i, audioEls[i]!)}
				onloadedmetadata={() => audioEls[i] && onLoadedMetadata(i, audioEls[i]!)}
				onended={() => onEnded(i)}
			></audio>

			<div class="glass-panel rounded-[20px] p-3 flex items-center gap-3 shadow-sm group">
				<!-- Play / pause button -->
				<button
					class="shrink-0 size-10 rounded-full flex items-center justify-center
					       bg-brand-indigo/10 hover:bg-brand-indigo hover:text-white
					       text-brand-indigo transition-all duration-200 shadow-sm"
					onclick={() => togglePlay(i)}
					aria-label={playingIndex === i ? 'Pause' : 'Play'}
				>
					{#if playingIndex === i}
						<Pause class="size-4" />
					{:else}
						<Play class="size-4 ml-0.5" />
					{/if}
				</button>

				<!-- Track info + progress -->
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-1.5 mb-2">
						<Music2 class="size-3 text-muted-foreground shrink-0" />
						<p class="text-xs font-semibold truncate">{track.title}</p>
						<span class="ml-auto text-xs text-muted-foreground tabular-nums shrink-0">
							{#if playingIndex === i && audioEls[i]}
								{formatTime(audioEls[i]!.currentTime)} / {formatTime(durations[i])}
							{:else}
								{formatTime(durations[i])}
							{/if}
						</span>
					</div>

					<!-- Progress bar -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
						onclick={(e) => seek(i, e)}
						role="slider"
						tabindex="0"
						aria-valuenow={Math.round((progresses[i] ?? 0) * 100)}
						aria-valuemin={0}
						aria-valuemax={100}
					>
						<div
							class="h-full bg-brand-indigo rounded-full transition-all duration-100"
							style="width: {progresses[i] * 100}%"
						></div>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
