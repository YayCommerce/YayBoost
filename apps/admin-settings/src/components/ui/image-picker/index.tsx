import { Trash, TrashIcon } from '@phosphor-icons/react';

import { Button } from '../button';

type ImagePickerValue = {
  id: string;
  url: string;
};

function ImagePicker({
  coverSrc,
  onSelectCover,
  onRemoveCover,
}: {
  coverSrc: string;
  onSelectCover: (value: ImagePickerValue) => void;
  onRemoveCover: () => void;
}) {
  const handleImageUpload = () => {
    // Create the media frame.
    const file_frame = (window.wp.media.frames.downloadable_file = window.wp.media({
      title: 'Choose an image',
      multiple: false,
    }));
    // When an image is selected, run a callback.
    file_frame.on('select', function () {
      const attachment = file_frame.state().get('selection').first().toJSON();

      const attachment_thumbnail = attachment.sizes?.full || attachment.sizes?.thumbnail;

      onSelectCover({
        id: String(attachment.id),
        url: attachment_thumbnail?.url || attachment.url,
      });
    });
    // Finally, open the modal.
    file_frame.open();
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleImageUpload}>
        <span>{coverSrc ? 'Replace Image' : 'Upload Image'}</span>
      </Button>

      {coverSrc && (
        <Button
          variant="outline"
          onClick={onRemoveCover}
          className="hover:text-destructive text-muted-foreground flex cursor-pointer items-center justify-center border-none shadow-none transition-colors disabled:opacity-50"
        >
          <TrashIcon className="text-red-600" />
        </Button>
      )}
    </div>
  );
}

export { ImagePicker };
