# Generates MultiApp launcher icons + in-app logo from ../branding/logo.png
# Usage (from app/):  powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class IconTool {
    // Background of the source logo is ~#F7FCFF. Returns a transparent crop of the wave mark only.
    public static Bitmap ExtractMark(string path, int maxY) {
        var src = new Bitmap(path);
        int w = src.Width, h = src.Height;
        var data = src.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        var px = new byte[w * h * 4];
        Marshal.Copy(data.Scan0, px, 0, px.Length);
        src.UnlockBits(data);

        int limit = (int)(h * (maxY / 1000.0));
        int minX = w, minY = h, maxX = 0, maxYY = 0;
        var outPx = new byte[w * h * 4];
        for (int y = 0; y < limit; y++) for (int x = 0; x < w; x++) {
            int i = (y * w + x) * 4;
            float b = px[i], g = px[i + 1], r = px[i + 2];
            float a = (247f - r) / (247f - 31f);
            if (a <= 0.02f) continue;
            if (a > 1f) a = 1f;
            // un-blend from background
            float rr = (r - 247f * (1 - a)) / a, gg = (g - 252f * (1 - a)) / a, bb = (b - 255f * (1 - a)) / a;
            outPx[i] = Clamp(bb); outPx[i + 1] = Clamp(gg); outPx[i + 2] = Clamp(rr); outPx[i + 3] = (byte)(a * 255);
            if (a > 0.3f) {
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxYY) maxYY = y;
            }
        }
        var full = new Bitmap(w, h, PixelFormat.Format32bppArgb);
        var d2 = full.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        Marshal.Copy(outPx, 0, d2.Scan0, outPx.Length);
        full.UnlockBits(d2);
        var crop = full.Clone(new Rectangle(minX, minY, maxX - minX + 1, maxYY - minY + 1), PixelFormat.Format32bppArgb);
        full.Dispose(); src.Dispose();
        return crop;
    }

    static byte Clamp(float v) { return (byte)(v < 0 ? 0 : v > 255 ? 255 : v); }

    // Draws mark centered in a square canvas, occupying `fraction` of the width.
    public static Bitmap Compose(Bitmap mark, int size, float fraction, string shape, bool mono) {
        var bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        using (var g = Graphics.FromImage(bmp)) {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.Clear(Color.Transparent);
            if (shape != "none") {
                using (var path = new GraphicsPath()) {
                    if (shape == "circle") path.AddEllipse(0, 0, size - 1, size - 1);
                    else {
                        float r = size * 0.22f;
                        path.AddArc(0, 0, r * 2, r * 2, 180, 90);
                        path.AddArc(size - 1 - r * 2, 0, r * 2, r * 2, 270, 90);
                        path.AddArc(size - 1 - r * 2, size - 1 - r * 2, r * 2, r * 2, 0, 90);
                        path.AddArc(0, size - 1 - r * 2, r * 2, r * 2, 90, 90);
                        path.CloseFigure();
                    }
                    using (var br = new LinearGradientBrush(new Point(0, 0), new Point(size, size),
                        Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 220, 241, 252)))
                        g.FillPath(br, path);
                }
            }
            float mw = size * fraction;
            float mh = mw * mark.Height / mark.Width;
            var dest = new RectangleF((size - mw) / 2f, (size - mh) / 2f, mw, mh);
            if (mono) {
                var cm = new ColorMatrix(new float[][] {
                    new float[] {0,0,0,0,0}, new float[] {0,0,0,0,0}, new float[] {0,0,0,0,0},
                    new float[] {0,0,0,1,0}, new float[] {1,1,1,0,1} });
                using (var ia = new ImageAttributes()) {
                    ia.SetColorMatrix(cm);
                    g.DrawImage(mark, Rectangle.Round(dest), 0, 0, mark.Width, mark.Height, GraphicsUnit.Pixel, ia);
                }
            } else g.DrawImage(mark, dest);
        }
        return bmp;
    }
}
'@

$root = Split-Path $PSScriptRoot -Parent
$src = Join-Path (Split-Path $root -Parent) 'branding\logo.png'
$res = Join-Path $root 'android\app\src\main\res'

# Only the top ~57% of the logo holds the wave mark (text lives below).
$mark = [IconTool]::ExtractMark($src, 570)
"Mark size: $($mark.Width)x$($mark.Height)"

# In-app logo (transparent)
$inApp = [IconTool]::Compose($mark, 720, 0.98, 'none', $false)
$inApp.Save((Join-Path $root 'assets\logo-mark.png'), [System.Drawing.Imaging.ImageFormat]::Png)

$densities = @{ 'mdpi' = 1; 'hdpi' = 1.5; 'xhdpi' = 2; 'xxhdpi' = 3; 'xxxhdpi' = 4 }
foreach ($d in $densities.Keys) {
    $f = $densities[$d]
    $dir = Join-Path $res "mipmap-$d"
    New-Item -ItemType Directory -Force $dir | Out-Null
    $legacy = [int](48 * $f)
    $fg = [int](108 * $f)
    ([IconTool]::Compose($mark, $legacy, 0.74, 'square', $false)).Save((Join-Path $dir 'ic_launcher.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    ([IconTool]::Compose($mark, $legacy, 0.70, 'circle', $false)).Save((Join-Path $dir 'ic_launcher_round.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    # Adaptive foreground: safe zone is the inner 66dp of 108dp
    ([IconTool]::Compose($mark, $fg, 0.56, 'none', $false)).Save((Join-Path $dir 'ic_launcher_foreground.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    ([IconTool]::Compose($mark, $fg, 0.56, 'none', $true)).Save((Join-Path $dir 'ic_launcher_monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png)
}
"Icons written."
