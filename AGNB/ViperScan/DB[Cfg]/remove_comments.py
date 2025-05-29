import sys

def remove_comments_and_blank_lines(input_file):
    with open(input_file, 'r') as file:
        lines = file.readlines()

    with open(input_file, 'w') as file:
        for line in lines:
            stripped_line = line.strip()
            if stripped_line and not stripped_line.startswith('#'):
                file.write(line)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python remove_comments.py <target_yaml>")
        sys.exit(1)

    target_yaml = sys.argv[1]
    remove_comments_and_blank_lines(target_yaml)
    print(f"Comments and blank lines removed from {target_yaml}")
