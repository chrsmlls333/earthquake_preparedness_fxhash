#!/bin/bash

reference_folder="/home/chrsm/development/understructures_fxhash/project/public/Plans-Iso/black/keep"
active_folder="/home/chrsm/development/understructures_fxhash/project/public/Plans-Iso/white/keep"

# Get a list of filenames from the reference folder
reference_files=($(ls "$reference_folder"))

# Remove files in the active folder that don't have matching names in the reference folder
for file in "$active_folder"/*; do
    filename=$(basename "$file")
    
    if ! [[ " ${reference_files[@]} " =~ " ${filename} " ]]; then
        rm "$file"
        echo "Deleted $filename"
    fi
done

echo "Files with non-matching names have been deleted from $active_folder."
