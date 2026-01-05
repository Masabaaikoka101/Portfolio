import { supabase } from "@/lib/supabase";
import { DEFAULTS } from "@/lib/constants";
import { ItemFormState } from "@/types";

export const ItemService = {
    /**
     * Uploads an image to Supabase Storage.
     */
    async uploadImage(fileBlob: Blob, userId: string): Promise<string> {
        const fileName = `${userId}/${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
            .from("item-images")
            .upload(fileName, fileBlob, { contentType: "image/png" });

        if (uploadError) {
            throw new Error(`Image upload failed: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
            .from("item-images")
            .getPublicUrl(fileName);

        return publicUrl;
    },

    /**
     * Saves the item to Supabase Database.
     */
    async saveItem(
        userId: string,
        imageUrl: string,
        formState: ItemFormState,
        tags: string[] = []
    ): Promise<void> {
        const { error: dbError } = await supabase.from("items").insert({
            user_id: userId,
            image_url: imageUrl,
            title: formState.title,
            description: formState.description,
            price: formState.price,
            status: formState.status,
            category: DEFAULTS.category,
            tags: tags,
        });

        if (dbError) {
            throw new Error(`Database save failed: ${dbError.message}`);
        }
    },

    /**
     * Fetches the current authenticated user.
     */
    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    }
};
