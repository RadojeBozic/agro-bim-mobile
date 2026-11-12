import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";
import { maxPhotoBytes } from "./submission";

export function discardPreparedPhoto(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {}
}
export async function prepareAdPhoto(asset: ImagePickerAsset) {
  if (!asset.width || !asset.height) throw new Error("Neispravna fotografija.");
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (Math.max(asset.width, asset.height) > 1600)
      context.resize(
        asset.width >= asset.height ? { width: 1600 } : { height: 1600 },
      );
    const image = await context.renderAsync();
    try {
      for (const compress of [0.82, 0.6, 0.4]) {
        const output = await image.saveAsync({
          format: SaveFormat.JPEG,
          compress,
        });
        const file = new File(output.uri);
        if (
          file.size > 0 &&
          file.size <= maxPhotoBytes &&
          output.width * output.height <= 4_000_000
        )
          return output.uri;
        discardPreparedPhoto(output.uri);
      }
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
  throw new Error("Fotografija je prevelika.");
}
