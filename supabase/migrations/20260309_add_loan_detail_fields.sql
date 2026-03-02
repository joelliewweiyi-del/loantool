ALTER TABLE loans ADD COLUMN IF NOT EXISTS google_maps_url text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS kadastrale_kaart_url text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE loans ADD COLUMN IF NOT EXISTS additional_info text;
