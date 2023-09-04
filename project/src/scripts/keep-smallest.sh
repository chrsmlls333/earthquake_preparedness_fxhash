#!/bin/bash

input_folder="./project/_original/assets/plans-iso-tiny/white"
output_folder="./project/public/assets/plans-iso-tiny/white"
max_size=13800000  # 10MB in bytes
total_size=0

mkdir -p "$output_folder"

# Find all PNG files in the input folder, sort them by file size
mapfile -t sorted_files < <(find "$input_folder" -type f -name "*.png" -exec du -b {} + | sort -n -k 1 | cut -f 2-)

for file in "${sorted_files[@]}"; do
    size=$(du -b "$file" | cut -f 1)
    
    if ((total_size + size <= max_size)); then
        cp "$file" "$output_folder"
        total_size=$((total_size + size))
    else
        echo "Reached maximum size limit. Exiting loop."
        break
    fi
done

echo "Copied files to $output_folder."