-- Match the app's advertised 5 MB limit. Existing files are not deleted.
begin;
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['application/pdf','image/jpeg','image/png']
where id = 'candidate-documents';
commit;
select id, file_size_limit, allowed_mime_types
from storage.buckets where id = 'candidate-documents';
