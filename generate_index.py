import os
import json

def generate_index():
    songs_folder = 'musica/canciones'
    json_folder = 'musica/json'
    
    # Obtener todos los MP3
    songs = [f for f in os.listdir(songs_folder) if f.endswith('.mp3')]
    
    # Guardar lista
    with open(os.path.join(songs_folder, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(songs, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Generado index.json con {len(songs)} canciones")

if __name__ == '__main__':
    generate_index()