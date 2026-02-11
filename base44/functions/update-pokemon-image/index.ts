import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { id, image_url } = await req.json();
    
    if (!id || !image_url) {
      return Response.json({ error: "id and image_url required" }, { status: 400 });
    }
    
    await base44.asServiceRole.entities.Pokemon.update(id, { image_url });
    
    return Response.json({ success: true, id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
