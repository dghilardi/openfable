<script lang="ts">
	import { page } from '$app/stores';
	import { createQuery } from '@tanstack/svelte-query';
	import { db } from '$lib/db';
	import { registryService } from '$lib/services/registry';
	import { Button } from '$lib/components/ui/button';
	import { Image } from '@unpic/svelte';
	import { ArrowLeft, Nfc, ExternalLink, Share2, Check, Download } from 'lucide-svelte';
	import { useNFC } from '$lib/hooks/useNFC.svelte';
    import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
    import { cn } from '$lib/utils';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { goto } from '$app/navigation';
	import AudioPlayer from '$lib/components/AudioPlayer.svelte';
	import FableForgeModal from '$lib/components/FableForgeModal.svelte';

    let { data } = $props();
	const id = $derived($page.params.id);

	const character = createQuery(() => ({
		queryKey: ['character', id],
		queryFn: async () => {
            if (!id) return null;
            return (await db.getCharacter(id)) || null;
        },
        initialData: data.character
	}));

    const nfc = useNFC();
    let showFableForgeModal = $state(false);

    async function handleShare(char: any) {
        const url = new URL(window.location.origin + '/character');
        url.searchParams.set('id', char.id);
        url.searchParams.set('registry', char.registry_url);
        
        const shareData = {
            title: `OpenFable - ${char.name}`,
            text: `Check out ${char.name} on OpenFable!`,
            url: url.toString()
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(url.toString());
                toast.success('Link copied to clipboard');
            }
        } catch (err) {
            // share cancelled or failed
        }
    }

    const queryClient = useQueryClient();

    const addRegistry = createMutation(() => ({
        mutationFn: async (url: string) => {
            await registryService.fetchRegistry(url);
        },
        onSuccess: () => {
            toast.success('Collection added to your library');
            queryClient.invalidateQueries({ queryKey: ['character', id] });
            queryClient.invalidateQueries({ queryKey: ['registries'] });
            queryClient.invalidateQueries({ queryKey: ['characters'] });
            goto(`/character/${id}`, { replaceState: true });
        },
        onError: (err) => {
            toast.error('Failed to add collection: ' + (err instanceof Error ? err.message : String(err)));
        }
    }));

    async function handleAddCollection() {
        if (!char?.registry_url) return;
        const existing = await registryService.getRegistryFromDB(char.registry_url);
        if (existing) {
            toast.info('Collection was already in your library');
            goto(`/character/${id}`, { replaceState: true });
            return;
        }
        addRegistry.mutate(char.registry_url);
    }

    const char = $derived(character.data);
    const isViewOnce = $derived($page.url.searchParams.get('viewOnce') === 'true');
</script>

<div class="container mx-auto p-4 max-w-4xl">
    {#if isViewOnce}
        <div class="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg mb-6 flex items-center justify-between">
            <div class="flex items-center">
                <ExternalLink class="w-4 h-4 mr-2" />
                <span class="text-sm font-medium">Temporary View: This character is not in your collection.</span>
            </div>
            <Button 
                variant="outline" 
                size="sm" 
                class="h-8 border-blue-300 text-blue-800 hover:bg-blue-100" 
                onclick={handleAddCollection}
                disabled={addRegistry.isPending}
            >
                {#if addRegistry.isPending}
                    Adding...
                {:else}
                    Add Collection
                {/if}
            </Button>
        </div>
    {/if}

    <div class="flex items-center justify-between mb-4">
        <Button variant="ghost" href="/" class="pl-0 hover:bg-transparent hover:underline">
            <ArrowLeft class="mr-2 h-4 w-4" /> Back to Gallery
        </Button>
        
        {#if char}
            <Button variant="outline" size="sm" onclick={() => handleShare(char)}>
                <Share2 class="mr-2 h-4 w-4" /> Share
            </Button>
        {/if}
    </div>

	{#if character.isError || !char}
		<div class="text-center py-20">
			<h2 class="text-2xl font-bold mb-4">Character Not Found</h2>
			<p class="text-muted-foreground mb-8">The character you are looking for does not exist in your local database.</p>
			<Button href="/">Back to Gallery</Button>
		</div>
	{:else}
		<div class="space-y-8">
            <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-4">
                    <Card.Root 
                        class="overflow-hidden bg-muted" 
                        style="view-transition-name: char-card-{id}"
                    >
                        <Image 
                            src={char.gallery_images[0] || char.preview_image} 
                            alt={char.name}
                            layout="fullWidth"
                            class="aspect-square object-cover"
                        />
                    </Card.Root>
                    
                    {#if char.gallery_images && char.gallery_images.length > 1}
                        <div class="grid grid-cols-4 gap-3">
                            {#each char.gallery_images as img}
                                <div class="aspect-square bg-muted rounded-xl overflow-hidden border border-border shadow-xs hover:scale-105 transition-transform">
                                    <Image src={img} alt="" layout="fullWidth" class="object-cover h-full" />
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div class="space-y-6">
                    <div>
                        <h1 class="text-4xl font-extrabold tracking-tight">{char.name}</h1>
                        <p class="text-lg text-muted-foreground mt-4 leading-relaxed">{char.description || 'No description available.'}</p>
                    </div>

                    <!-- Audio Tracks Player -->
                    {#if (char.tracks && char.tracks.length > 0) || char.audio_sample_url}
                        <div class="space-y-3">
                            <h3 class="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                                Tracce Audio
                            </h3>
                            <AudioPlayer
                                tracks={char.tracks ?? []}
                                fallbackUrl={char.audio_sample_url}
                                fallbackLabel="Preview"
                            />
                        </div>
                    {/if}

                    <!-- Download zip -->
                    {#if char.audio_zip_url}
                        <Button variant="outline" class="w-full text-brand-indigo rounded-[20px] h-12" href={char.audio_zip_url} target="_blank">
                            <Download class="mr-2 size-5" /> Download Audio Assets (.zip)
                        </Button>
                    {/if}

                    <!-- Open in FableForge -->
                    <div class="pt-2">
                        <Button
                            variant="magic"
                            class="w-full h-14 text-xl transition-all duration-500 shadow-xl md:shadow-md magic-hover relative overflow-hidden"
                            onclick={() => showFableForgeModal = true}
                        >
                            <div class="flex items-center justify-center gap-2">
                                <ExternalLink class="size-5" />
                                <span>Apri in FableForge</span>
                            </div>
                        </Button>
                    </div>

                    <!-- NFC Write (if supported) -->
                    {#if nfc.status !== 'unsupported'}
                        <div class="pt-6 border-t">
                            <h3 class="font-bold text-lg flex items-center mb-4 text-brand-indigo">
                                <Nfc class="mr-2 size-5" /> The Magic Touch
                            </h3>
                            <div class="w-full py-4">
                                <Button 
                                    variant="magic" 
                                    class={cn(
                                        "w-full h-14 text-xl transition-all duration-500 shadow-xl md:shadow-md magic-hover relative overflow-hidden",
                                        nfc.status === 'success' && "bg-spark-teal shadow-spark-teal/20 w-14 rounded-full p-0 mx-auto block"
                                    )}
                                    disabled={nfc.status === 'scanning' || nfc.status === 'writing'}
                                    onclick={() => char.nfc_payload && nfc.write(char.nfc_payload)}
                                >
                                    {#if nfc.status === 'scanning'}
                                        <div class="flex items-center justify-center gap-3">
                                            <span class="animate-pulse">Approach Tag...</span>
                                        </div>
                                    {:else if nfc.status === 'writing'}
                                        <div class="flex items-center justify-center gap-3">
                                            <Nfc class="animate-spin" />
                                            <span>Writing...</span>
                                        </div>
                                    {:else if nfc.status === 'success'}
                                        <div class="flex items-center justify-center size-full animate-in zoom-in">
                                            <Check class="size-8 text-white animate-draw" />
                                        </div>
                                    {:else}
                                        <div class="flex items-center justify-center gap-2">
                                            <Nfc class="size-6" />
                                            <span>Write to Tag</span>
                                        </div>
                                    {/if}
                                </Button>
                                
                                {#if nfc.error}
                                    <div class="mt-2">
                                        <p class="text-sm text-destructive text-center font-medium animate-in fade-in">
                                            {nfc.error}
                                        </p>
                                    </div>
                                {/if}
                            </div>
                            <!-- Spacer for Mobile Sticky Button -->
                            <div class="h-24 md:hidden"></div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- FableForge modal -->
            <FableForgeModal
                bind:open={showFableForgeModal}
                characterId={char.id}
                registryUrl={char.registry_url}
            />

            {#if char.models_3d && char.models_3d.length > 0}
                <div class="space-y-4">
                    <h2 class="text-xl font-bold">3D Models</h2>
                    <div class="grid gap-4 sm:grid-cols-2">
                        {#each char.models_3d as model}
                            <Card.Root>
                                <Card.Content class="p-4 flex items-center justify-between">
                                    <span class="capitalize">{model.provider} Model</span>
                                    <Button variant="ghost" size="sm" href={model.url} target="_blank">
                                        View <ExternalLink class="ml-2 h-3 w-3" />
                                    </Button>
                                </Card.Content>
                            </Card.Root>
                        {/each}
                    </div>
                </div>
            {/if}
		</div>
	{/if}
</div>
