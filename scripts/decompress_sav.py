import sys
from palsav.compressor.oozlib import OozLib

def main():
    if len(sys.argv) < 3:
        print("Usage: python decompress_sav.py <input.sav> <output.gvas>")
        sys.exit(1)

    sav_path = sys.argv[1]
    gvas_path = sys.argv[2]

    with open(sav_path, "rb") as f:
        data = f.read()

    decomp, _ = OozLib().decompress(data)

    with open(gvas_path, "wb") as f:
        f.write(decomp)

if __name__ == "__main__":
    main()
