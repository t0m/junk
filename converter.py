import sys
import os
import struct
import binascii

bitfields = {
    0:  'BI_RGB',
    1:  'BI_RLE8',
    2:  'BI_RLE4',
    3:  'BI_BITFIELDS',
    4:  'BI_JPEG',
    5:  'BI_PNG',
    6:  'BI_ALPHABITFIELDS',
    11: 'BI_CMYK',
    12: 'BI_CMYKRLE8',
    13: 'BI_CMYKRLE4',
}

with open(sys.argv[1], 'rb') as in_f:
    bitmap_bytes = in_f.read()

assert bitmap_bytes[0:2] == b'BM'
bitmap_size = bitmap_bytes[2:6]
print(struct.unpack('I', bitmap_size)[0])

bitmap_offset = struct.unpack('I', bitmap_bytes[10:14])[0]
print("Bitmap offset: %d" % bitmap_offset)

bitmap_info_size = struct.unpack('I', bitmap_bytes[14:18])[0]
print("Bitmap info size: %d" % bitmap_info_size)
assert bitmap_info_size in (124, 108, 56, 52, 40, 16, 64, 2)

bitmap_width = struct.unpack('I', bitmap_bytes[18:22])[0]
bitmap_height = struct.unpack('I', bitmap_bytes[22:26])[0]
print(bitmap_width, bitmap_height)

bits_per_pixel = struct.unpack('h', bitmap_bytes[28:30])[0]
print("Bits per pixel:  %d" % bits_per_pixel)

compression = struct.unpack('I', bitmap_bytes[30:34])[0]
print("Compression:     %s" % bitfields[compression])

bi_image_size = struct.unpack('I', bitmap_bytes[34:38])[0]
print("Image size:      %d" % bi_image_size)
print("X pix per meter: %d" % struct.unpack('I', bitmap_bytes[38:42])[0])
print("Y pix per meter: %d" % struct.unpack('I', bitmap_bytes[42:46])[0])
print("color used:      %d" % struct.unpack('I', bitmap_bytes[46:50])[0])
print("important:       %d" % struct.unpack('I', bitmap_bytes[50:54])[0])

if compression != 3:
    print("non-bitfields compression")
else:
    red_channel   = bitmap_bytes[54:58]
    green_channel = bitmap_bytes[58:62]
    blue_channel  = bitmap_bytes[62:66]
    alpha_channel = bitmap_bytes[66:70]
    print("red channel:     %s" % binascii.hexlify(red_channel).decode('utf-8'))
    print("green channel:   %s" % binascii.hexlify(green_channel).decode('utf-8'))
    print("blue channel:    %s" % binascii.hexlify(blue_channel).decode('utf-8'))
    print("alpha channel:   %s" % binascii.hexlify(alpha_channel).decode('utf-8'))

if bits_per_pixel != 32:
    print("Not a 32-bits per pixel bitmap, exiting")
    sys.exit(1)

buf = bytearray()
with open('test_argb.bmp', 'wb') as out_f:
    out_f.write(bitmap_bytes[0:54])

    if compression == 3:
        out_f.write(blue_channel) # swap red and blue channels
        out_f.write(green_channel)
        out_f.write(red_channel)
        out_f.write(alpha_channel)
        # rest of the header
        out_f.write(bitmap_bytes[70:70+(bitmap_offset-70)])

    offset = bitmap_offset
    while True:
        row = bitmap_bytes[offset:offset+4]
        assert isinstance(row, bytes)

        if not row:
            break

        if len(row) != 4:
            buf.extend(row)
        else:
            buf.append(row[0]) # swap red and blue channels
            buf.append(row[3])
            buf.append(row[2])
            buf.append(row[1])

        offset += 4

    out_f.write(buf)

