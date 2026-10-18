package com.abzora.transfertpos;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.net.Uri;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.exifinterface.media.ExifInterface;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Camera/gallery and bundled on-device OCR. Document pixels never enter logs. */
@CapacitorPlugin(name="IdentityScanner",permissions={@Permission(alias="camera",strings={Manifest.permission.CAMERA})})
public class IdentityScannerPlugin extends Plugin {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final TextRecognizer reader=TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    private volatile boolean busy=false;

    @PluginMethod public void takePhoto(PluginCall call) {
        if(busy){call.reject("Une lecture de pièce est déjà en cours.","BUSY");return;}
        if(getPermissionState("camera")!=PermissionState.GRANTED){busy=true;requestPermissionForAlias("camera",call,"cameraPermission");}
        else openCamera(call);
    }
    @PermissionCallback private void cameraPermission(PluginCall call) {
        if(getPermissionState("camera")==PermissionState.GRANTED)openCamera(call);
        else {busy=false;call.reject("Autorisez la caméra dans les paramètres de YamTrans pour photographier la pièce.","CAMERA_DENIED");}
    }
    private void openCamera(PluginCall call) {
        try {
            File dir=new File(getContext().getCacheDir(),"identity");dir.mkdirs();
            // Remove abandoned camera files older than one day.
            File[] old=dir.listFiles();if(old!=null)for(File f:old)if(f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
            File file=File.createTempFile("piece-",".jpg",dir);
            call.getData().put("cameraPath",file.getAbsolutePath());
            Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file);
            Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_OUTPUT,uri);intent.setClipData(ClipData.newRawUri("Pièce",uri));
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);
            busy=true;startActivityForResult(call,intent,"imageResult");
        } catch(Exception e){busy=false;deleteCameraFile(call);call.reject("Impossible d’ouvrir l’appareil photo. Vous pouvez importer une image.","CAMERA_UNAVAILABLE");}
    }
    @PluginMethod public void choosePhoto(PluginCall call) {
        if(busy){call.reject("Une lecture de pièce est déjà en cours.","BUSY");return;}
        try {
            Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.setType("image/*");intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);busy=true;startActivityForResult(call,intent,"imageResult");
        } catch(Exception e){busy=false;call.reject("Impossible d’ouvrir les images du téléphone.","GALLERY_UNAVAILABLE");}
    }
    @ActivityCallback private void imageResult(PluginCall call,ActivityResult result) {
        if(call==null){busy=false;return;}
        if(result.getResultCode()!=Activity.RESULT_OK){busy=false;deleteCameraFile(call);call.reject("Prise de vue annulée.","CANCELLED");return;}
        String path=call.getString("cameraPath");
        Uri uri=path!=null?Uri.fromFile(new File(path)):result.getData()!=null?result.getData().getData():null;
        if(uri==null){busy=false;deleteCameraFile(call);call.reject("Aucune image reçue.","IMAGE_MISSING");return;}
        worker.execute(()->{
            try {
                Bitmap bitmap=loadBitmap(uri);
                ByteArrayOutputStream bytes=new ByteArrayOutputStream();bitmap.compress(Bitmap.CompressFormat.JPEG,88,bytes);
                String image="data:image/jpeg;base64,"+Base64.encodeToString(bytes.toByteArray(),Base64.NO_WRAP);
                reader.process(InputImage.fromBitmap(bitmap,0))
                    .addOnSuccessListener(text->{JSObject out=new JSObject();out.put("image",image);out.put("text",text.getText());out.put("engine","android-mlkit");call.resolve(out);})
                    .addOnFailureListener(e->{JSObject out=new JSObject();out.put("image",image);out.put("text","");out.put("warning","Lecture impossible. Reprenez une photo nette ou saisissez le numéro.");call.resolve(out);})
                    .addOnCompleteListener(task->{bitmap.recycle();deleteCameraFile(call);busy=false;});
            } catch(Exception e){busy=false;deleteCameraFile(call);call.reject("Image illisible. Reprenez une photo nette de la pièce entière.","IMAGE_INVALID");}
        });
    }
    private Bitmap loadBitmap(Uri uri) throws Exception {
        BitmapFactory.Options opts=new BitmapFactory.Options();opts.inJustDecodeBounds=true;
        try(InputStream in=getContext().getContentResolver().openInputStream(uri)){BitmapFactory.decodeStream(in,null,opts);}
        if(opts.outWidth<=0||opts.outHeight<=0||(long)opts.outWidth*opts.outHeight>100000000L)throw new Exception("dimensions");
        int sample=1;while(Math.max(opts.outWidth,opts.outHeight)/sample>3000)sample*=2;
        opts.inJustDecodeBounds=false;opts.inSampleSize=sample;
        Bitmap bitmap;try(InputStream in=getContext().getContentResolver().openInputStream(uri)){bitmap=BitmapFactory.decodeStream(in,null,opts);}
        if(bitmap==null)throw new Exception("decode");
        Matrix matrix=new Matrix();
        try(InputStream in=getContext().getContentResolver().openInputStream(uri)){
            ExifInterface exif=new ExifInterface(in);int orientation=exif.getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
            if(orientation==ExifInterface.ORIENTATION_ROTATE_90||orientation==ExifInterface.ORIENTATION_TRANSPOSE)matrix.postRotate(90);
            if(orientation==ExifInterface.ORIENTATION_ROTATE_180||orientation==ExifInterface.ORIENTATION_FLIP_VERTICAL)matrix.postRotate(180);
            if(orientation==ExifInterface.ORIENTATION_ROTATE_270||orientation==ExifInterface.ORIENTATION_TRANSVERSE)matrix.postRotate(270);
            if(orientation==ExifInterface.ORIENTATION_FLIP_HORIZONTAL||orientation==ExifInterface.ORIENTATION_FLIP_VERTICAL||orientation==ExifInterface.ORIENTATION_TRANSPOSE||orientation==ExifInterface.ORIENTATION_TRANSVERSE)matrix.postScale(-1,1);
        } catch(Exception ignored){}
        if(!matrix.isIdentity()){Bitmap rotated=Bitmap.createBitmap(bitmap,0,0,bitmap.getWidth(),bitmap.getHeight(),matrix,true);if(rotated!=bitmap)bitmap.recycle();bitmap=rotated;}
        float scale=Math.min(1f,2400f/Math.max(bitmap.getWidth(),bitmap.getHeight()));
        if(scale<1){Bitmap small=Bitmap.createScaledBitmap(bitmap,Math.round(bitmap.getWidth()*scale),Math.round(bitmap.getHeight()*scale),true);bitmap.recycle();bitmap=small;}
        return bitmap;
    }
    private void deleteCameraFile(PluginCall call){String path=call.getString("cameraPath");if(path!=null)new File(path).delete();}
    @Override protected void handleOnDestroy(){reader.close();worker.shutdown();}
}
