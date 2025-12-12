#!/bin/bash
# Fix permissions for Docker volumes to work with non-root user (UID 1000)

echo "Fixing permissions for Whisper WebUI volumes..."

# Fix local backend directory permissions
if [ -d "./backend" ]; then
    echo "Setting permissions for ./backend..."
    sudo chown -R 1000:1000 ./backend
fi

# Fix Docker volumes
echo "Setting permissions for Docker volumes..."
docker volume ls | grep whisper_webui | awk '{print $2}' | while read volume; do
    echo "Fixing volume: $volume"
    docker run --rm -v $volume:/data alpine chown -R 1000:1000 /data
done

echo "✓ Permissions fixed successfully!"
echo ""
echo "You can now run: docker-compose up --build"
