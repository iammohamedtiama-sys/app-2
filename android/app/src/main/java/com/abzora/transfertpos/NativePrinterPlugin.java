package com.abzora.transfertpos;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.Settings;
import android.net.Uri;
import android.util.Base64;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PluginMethod;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
        name = "NativePrinter",
        permissions = {
                @Permission(
                        alias = "bluetooth",
                        strings = {
                                Manifest.permission.BLUETOOTH_CONNECT,
                                Manifest.permission.BLUETOOTH_SCAN
                        }
                ),
                @Permission(
                        alias = "camera",
                        strings = { Manifest.permission.CAMERA }
                )
        }
)
public class NativePrinterPlugin extends Plugin {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static BluetoothSocket cachedSocket;
    private static OutputStream cachedOutput;
    private static String cachedAddress = "";
    private static long cachedAt = 0L;
    private static final Object PRINT_LOCK = new Object();
    private static final long SOCKET_TTL_MS = 120000L;
    private static final Charset PRINTER_CHARSET = Charset.forName("CP850");
    private WebView printWebView;

    @PluginMethod
    public void shareBase64File(PluginCall call) {
        String base64 = call.getString("base64", "");
        String filename = call.getString("filename", "export.bin");
        String mime = call.getString("mime", "application/octet-stream");
        if (base64 == null || base64.isEmpty()) {
            call.reject("Fichier vide");
            return;
        }
        try {
            byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
            File dir = new File(getContext().getCacheDir(), "exports");
            if (!dir.exists() && !dir.mkdirs()) throw new Exception("Impossible de créer le dossier d'export");
            File file = new File(dir, filename.replaceAll("[^a-zA-Z0-9._-]", "_"));
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(bytes);
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType(mime);
            intent.putExtra(Intent.EXTRA_STREAM, uri);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            Intent chooser = Intent.createChooser(intent, "Enregistrer ou partager " + filename);
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            JSObject result = new JSObject();
            result.put("shared", true);
            result.put("filename", filename);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Export impossible: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        String title = call.getString("title", "Ticket YamTrans");
        if (html == null || html.trim().isEmpty()) {
            call.reject("Le contenu à imprimer est vide.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                printWebView = new WebView(getContext());
                printWebView.getSettings().setJavaScriptEnabled(false);
                printWebView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        try {
                            PrintManager manager = (PrintManager) getContext().getSystemService(Context.PRINT_SERVICE);
                            if (manager == null) {
                                call.reject("Service d'impression Android indisponible.");
                                printWebView = null;
                                return;
                            }
                            PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(title);
                            PrintAttributes attributes = new PrintAttributes.Builder()
                                    .setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
                                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                                    .build();
                            manager.print(title, adapter, attributes);
                            JSObject result = new JSObject();
                            result.put("opened", true);
                            call.resolve(result);
                        } catch (Exception error) {
                            call.reject("Impossible d'ouvrir l'impression: " + error.getMessage(), error);
                        }
                    }
                });
                printWebView.loadDataWithBaseURL(null, html, "text/HTML", "UTF-8", null);
            } catch (Exception error) {
                call.reject("Erreur d'impression: " + error.getMessage(), error);
            }
        });
    }

    @PluginMethod
    public void listPairedBluetoothPrinters(PluginCall call) {
        if (needsBluetoothPermission()) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPermissionCallback");
            return;
        }
        listPairedDevices(call);
    }

    @PermissionCallback
    private void bluetoothPermissionCallback(PluginCall call) {
        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            listPairedDevices(call);
        } else {
            call.reject("Autorisation Bluetooth refusée.");
        }
    }

    private void listPairedDevices(PluginCall call) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                call.reject("Ce terminal ne prend pas en charge le Bluetooth.");
                return;
            }
            if (!adapter.isEnabled()) {
                call.reject("Activez le Bluetooth puis réessayez.");
                return;
            }
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            JSArray devices = new JSArray();
            for (BluetoothDevice device : bonded) {
                JSObject item = new JSObject();
                item.put("name", device.getName() == null ? "Imprimante Bluetooth" : device.getName());
                item.put("address", device.getAddress());
                devices.put(item);
            }
            JSObject result = new JSObject();
            result.put("devices", devices);
            call.resolve(result);
        } catch (SecurityException error) {
            call.reject("Autorisation Bluetooth requise.", error);
        } catch (Exception error) {
            call.reject("Impossible de lister les appareils Bluetooth: " + error.getMessage(), error);
        }
    }

    @PluginMethod
    public void printEscPosBluetooth(PluginCall call) {
        if (needsBluetoothPermission()) {
            requestPermissionForAlias("bluetooth", call, "bluetoothPrintPermissionCallback");
            return;
        }
        executeBluetoothPrint(call);
    }

    @PermissionCallback
    private void bluetoothPrintPermissionCallback(PluginCall call) {
        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            executeBluetoothPrint(call);
        } else {
            call.reject("Autorisation Bluetooth refusée.");
        }
    }

    private boolean needsBluetoothPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && getPermissionState("bluetooth") != PermissionState.GRANTED;
    }

    private void executeBluetoothPrint(PluginCall call) {
        String address = call.getString("address", "");
        String company = call.getString("company", "YamTrans");
        String receipt = call.getString("receipt", "");
        String parcel = call.getString("parcel", "");
        String receiptQr = call.getString("receiptQr", "");
        String receiptQrImage = call.getString("receiptQrImage", "");
        String parcelQrImage = call.getString("parcelQrImage", "");
        String logoImage = call.getString("logoImage", "");
        String receiptTitle = call.getString("receiptTitle", "RECU CLIENT");
        String parcelQr = call.getString("parcelQr", "");
        String printPart = call.getString("printPart", "both");
        String companyPhone = call.getString("companyPhone", "");
        String companyAddress = call.getString("companyAddress", "");
        String code = call.getString("code", "");
        String route = call.getString("route", "");
        String agent = call.getString("agent", "");
        String parcelCount = call.getString("parcelCount", "1");
        String receiptMention = call.getString("receiptMention", "CONSERVEZ CE RECU");
        String parcelMention = call.getString("parcelMention", "");
        Integer paperWidth = call.getInt("paperWidth", 80);

        if (address.trim().isEmpty()) {
            call.reject("Aucune imprimante Bluetooth n'est sélectionnée.");
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) {
                    call.reject("Bluetooth désactivé ou indisponible.");
                    return;
                }
                BluetoothDevice device = adapter.getRemoteDevice(address);
                adapter.cancelDiscovery();
                boolean connectionReused = false;
                synchronized (PRINT_LOCK) {
                    long age = System.currentTimeMillis() - cachedAt;
                    boolean reuse = cachedSocket != null && cachedSocket.isConnected() && cachedOutput != null && address.equals(cachedAddress) && age < SOCKET_TTL_MS;
                    connectionReused = reuse;
                    if (!reuse) {
                        closeCachedPrinter();
                        cachedSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                        cachedSocket.connect();
                        cachedOutput = cachedSocket.getOutputStream();
                        cachedAddress = address;
                    }
                    byte[] ticket = buildTicket(company, companyPhone, companyAddress, code, route, agent, parcelCount, receipt, parcel, receiptMention, parcelMention, receiptQr, parcelQr, receiptQrImage, parcelQrImage, logoImage, receiptTitle, printPart, paperWidth);
                    try {
                        cachedOutput.write(ticket);
                        cachedOutput.flush();
                        cachedAt = System.currentTimeMillis();
                    } catch (Exception firstError) {
                        closeCachedPrinter();
                        cachedSocket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                        cachedSocket.connect();
                        cachedOutput = cachedSocket.getOutputStream();
                        cachedAddress = address;
                        cachedOutput.write(ticket);
                        cachedOutput.flush();
                        cachedAt = System.currentTimeMillis();
                    }
                }

                JSObject result = new JSObject();
                result.put("printed", true);
                result.put("device", device.getName());
                result.put("connectionReused", connectionReused);
                call.resolve(result);
            } catch (SecurityException error) {
                call.reject("Autorisation Bluetooth requise.", error);
            } catch (Exception error) {
                call.reject("Échec de connexion ou d'impression Bluetooth: " + error.getMessage(), error);
            } finally {
                // La connexion reste ouverte brièvement afin d'accélérer le talon et les impressions suivantes.
            }
        }).start();
    }

    private static void closeCachedPrinter() {
        try { if (cachedOutput != null) cachedOutput.close(); } catch (Exception ignored) { }
        try { if (cachedSocket != null) cachedSocket.close(); } catch (Exception ignored) { }
        cachedOutput = null;
        cachedSocket = null;
        cachedAddress = "";
        cachedAt = 0L;
    }

    private byte[] buildTicket(String company, String companyPhone, String companyAddress, String code, String route, String agent, String parcelCount, String receipt, String parcel, String receiptMention, String parcelMention, String receiptQr, String parcelQr, String receiptQrImage, String parcelQrImage, String logoImage, String receiptTitle, String printPart, int paperWidth) throws Exception {
        ByteArrayOutputStream data = new ByteArrayOutputStream();
        data.write(new byte[]{0x1B, 0x40});
        data.write(new byte[]{0x1B, 0x74, 0x02});
        boolean printReceipt = "receipt".equals(printPart) || "both".equals(printPart);
        boolean printParcel = "parcel".equals(printPart) || "both".equals(printPart);

        if (printReceipt) {
            printHeader(data, company, companyPhone, companyAddress, receiptTitle, paperWidth, logoImage);
            printLargeCode(data, code);
            data.write(new byte[]{0x1B, 0x61, 0x00});
            writeText(data, receipt + "\n");
            if (!receiptQrImage.isEmpty()) {
                data.write(new byte[]{0x1B, 0x61, 0x01});
                writeRasterImage(data, receiptQrImage, paperWidth <= 58 ? 180 : 240);
                writeText(data, "Scannez pour les agences et la localisation.\n");
            } else if (!receiptQr.isEmpty()) {
                data.write(new byte[]{0x1B, 0x61, 0x01});
                writeQr(data, receiptQr);
            }
            data.write(new byte[]{0x1B, 0x45, 0x01});
            data.write(new byte[]{0x1B, 0x61, 0x01});
            writeText(data, receiptMention + "\n");
            data.write(new byte[]{0x1B, 0x45, 0x00});
            writeText(data, "\n\n");
        }

        if (printParcel) {
            printHeader(data, company, companyPhone, companyAddress, "TALON / ETIQUETTE COLIS", paperWidth, logoImage);
            printLargeCode(data, code);
            data.write(new byte[]{0x1B, 0x61, 0x01});
            data.write(new byte[]{0x1B, 0x45, 0x01});
            data.write(new byte[]{0x1D, 0x21, 0x01});
            writeText(data, route + "\n");
            data.write(new byte[]{0x1D, 0x21, 0x00});
            data.write(new byte[]{0x1B, 0x45, 0x00});
            if (!parcelQrImage.isEmpty()) writeRasterImage(data, parcelQrImage, paperWidth <= 58 ? 190 : 250);
            else if (!parcelQr.isEmpty()) writeQr(data, parcelQr);
            data.write(new byte[]{0x1B, 0x61, 0x00});
            writeText(data, parcel + "\n");
            data.write(new byte[]{0x1B, 0x61, 0x01});
            data.write(new byte[]{0x1B, 0x45, 0x01});
            data.write(new byte[]{0x1D, 0x21, 0x11});
            writeText(data, "NE PAS DECOLLER\n");
            data.write(new byte[]{0x1D, 0x21, 0x00});
            if (!parcelMention.isEmpty()) writeText(data, parcelMention + "\n");
            data.write(new byte[]{0x1B, 0x45, 0x00});
            writeText(data, "\n\n");
        }
        data.write(new byte[]{0x1D, 0x56, 0x42, 0x00});
        return data.toByteArray();
    }

    private void printHeader(ByteArrayOutputStream data, String company, String phone, String address, String title, int paperWidth, String logoImage) throws Exception {
        if (logoImage != null && !logoImage.isEmpty()) {
            data.write(new byte[]{0x1B, 0x61, 0x01});
            writeRasterImage(data, logoImage, paperWidth <= 58 ? 110 : 140);
        }
        data.write(new byte[]{0x1B, 0x61, 0x01});
        data.write(new byte[]{0x1B, 0x45, 0x01});
        data.write(new byte[]{0x1D, 0x21, 0x11});
        writeText(data, company + "\n");
        data.write(new byte[]{0x1D, 0x21, 0x00});
        if (!phone.isEmpty()) writeText(data, phone + "\n");
        if (!address.isEmpty()) writeText(data, address + "\n");
        writeSeparator(data, paperWidth);
        data.write(new byte[]{0x1D, 0x21, 0x01});
        writeText(data, title + "\n");
        data.write(new byte[]{0x1D, 0x21, 0x00});
        data.write(new byte[]{0x1B, 0x45, 0x00});
    }

    private void printLargeCode(ByteArrayOutputStream data, String code) throws Exception {
        data.write(new byte[]{0x1B, 0x61, 0x01});
        data.write(new byte[]{0x1B, 0x45, 0x01});
        writeText(data, "+------------------------------+\n");
        data.write(new byte[]{0x1D, 0x21, 0x22});
        writeText(data, code + "\n");
        data.write(new byte[]{0x1D, 0x21, 0x00});
        writeText(data, "+------------------------------+\n");
        data.write(new byte[]{0x1B, 0x45, 0x00});
    }

    private void writeText(ByteArrayOutputStream data, String value) throws Exception {
        data.write(value.replace("’", "'").replace("œ", "oe").getBytes(PRINTER_CHARSET));
    }

    private void writeSeparator(ByteArrayOutputStream data, int width) throws Exception {
        int chars = width <= 58 ? 32 : 48;
        StringBuilder line = new StringBuilder();
        for (int i = 0; i < chars; i++) line.append('-');
        writeText(data, line.toString() + "\n");
    }

    private void writeRasterImage(ByteArrayOutputStream data, String dataUrl, int maxWidth) throws Exception {
        String base64 = dataUrl.contains(",") ? dataUrl.substring(dataUrl.indexOf(',') + 1) : dataUrl;
        byte[] decoded = Base64.decode(base64, Base64.DEFAULT);
        Bitmap original = BitmapFactory.decodeByteArray(decoded, 0, decoded.length);
        if (original == null) return;
        int targetWidth = Math.min(maxWidth, original.getWidth());
        int targetHeight = Math.max(1, Math.round(original.getHeight() * (targetWidth / (float) original.getWidth())));
        Bitmap bitmap = Bitmap.createScaledBitmap(original, targetWidth, targetHeight, true);
        int widthBytes = (targetWidth + 7) / 8;
        data.write(new byte[]{0x1B, 0x61, 0x01});
        data.write(new byte[]{0x1D, 0x76, 0x30, 0x00, (byte)(widthBytes & 0xFF), (byte)((widthBytes >> 8) & 0xFF), (byte)(targetHeight & 0xFF), (byte)((targetHeight >> 8) & 0xFF)});
        for (int y = 0; y < targetHeight; y++) {
            for (int xb = 0; xb < widthBytes; xb++) {
                int value = 0;
                for (int bit = 0; bit < 8; bit++) {
                    int x = xb * 8 + bit;
                    if (x < targetWidth) {
                        int pixel = bitmap.getPixel(x, y);
                        int gray = (Color.red(pixel) * 30 + Color.green(pixel) * 59 + Color.blue(pixel) * 11) / 100;
                        if (gray < 180) value |= (0x80 >> bit);
                    }
                }
                data.write(value);
            }
        }
        writeText(data, "\n");
        bitmap.recycle();
        if (original != bitmap) original.recycle();
    }

    private void writeQr(ByteArrayOutputStream data, String value) throws Exception {
        byte[] qr = value.getBytes(Charset.forName("UTF-8"));
        data.write(new byte[]{0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00});
        data.write(new byte[]{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06});
        data.write(new byte[]{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31});
        int length = qr.length + 3;
        data.write(new byte[]{0x1D, 0x28, 0x6B, (byte) (length & 0xFF), (byte) ((length >> 8) & 0xFF), 0x31, 0x50, 0x30});
        data.write(qr);
        data.write(new byte[]{0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30});
    }

    @PluginMethod
    public void cameraPermissionStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("state", getPermissionState("camera").toString().toLowerCase());
        call.resolve(result);
    }

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("camera", call, "cameraPermissionCallback");
    }

    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", getPermissionState("camera") == PermissionState.GRANTED);
        result.put("state", getPermissionState("camera").toString().toLowerCase());
        call.resolve(result);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Impossible d'ouvrir les paramètres de l'application", error);
        }
    }

    @PluginMethod
    public void openPrintSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_PRINT_SETTINGS);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Impossible d'ouvrir les paramètres d'impression", error);
        }
    }

    @PluginMethod
    public void openBluetoothSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_BLUETOOTH_SETTINGS);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception error) {
            call.reject("Impossible d'ouvrir les paramètres Bluetooth", error);
        }
    }
}
