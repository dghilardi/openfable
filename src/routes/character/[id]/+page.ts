import { db } from '$lib/db';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
    const { id } = params;
    
    // We pre-fetch the character from IDB.
    // This happens ON THE CLIENT during navigation.
    const character = await db.getCharacter(id);
    
    if (!character) {
        throw error(404, 'Character not found');
    }
    
    return {
        character
    };
};
