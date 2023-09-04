#!/bin/bash

reference_folder="./project/public/assets/plans-iso-tiny/white"
active_folder="./project/public/assets/plans-iso-tiny/black"

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
