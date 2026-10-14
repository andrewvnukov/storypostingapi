/**
 * Turns the publish form into the fields the queue stores, applying the two
 * rules TikTok checks during app review.
 */
export function publishFieldsFrom(body) {
  const mode = body.mode === 'draft' ? 'draft' : 'direct';
  const privacy = mode === 'direct' ? body.privacy_level : null;
  const brandContent = body.brand_content === 'on';

  if (mode === 'direct' && !privacy) throw new Error('Choose who can view this video');
  if (brandContent && privacy === 'SELF_ONLY') {
    throw new Error('Branded content cannot be posted with the Private visibility setting');
  }

  return {
    mode,
    privacy_level: privacy,
    title: body.title ?? '',
    disable_comment: body.disable_comment === 'on' ? 1 : 0,
    disable_duet: body.disable_duet === 'on' ? 1 : 0,
    disable_stitch: body.disable_stitch === 'on' ? 1 : 0,
    brand_organic: body.brand_organic === 'on' ? 1 : 0,
    brand_content: brandContent ? 1 : 0,
    is_aigc: body.is_aigc === 'on' ? 1 : 0,
    run_at: body.run_at ? new Date(body.run_at).getTime() : Date.now(),
  };
}
