#!/usr/bin/env python3
"""
Simple pygame demo for Freecity India Player - sprite version
Save at the repository root and run:
  python3 demo_pygame.py

This version will try to load assets/player.png, assets/npc.png, assets/ground.png (64x64)
If they don't exist, it will generate simple flat-style sprites at runtime and save them to assets/.

Controls:
  WASD / Arrow keys - move
  E - earn money (auto-select a method)
  I - add a sample item to inventory (toggle)
  H - take damage (simulate)
  J - heal
  SPACE - interact with nearby NPC
  ESC or close window - quit

Requires: pygame (pip install pygame)
"""
import sys
import os
import math
import pygame
import time

# Make src importable
ROOT = os.path.dirname(__file__)
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from entities.player import Player, PlayerClass
from entities.npc import NPC, NPCType
from entities.npc_interaction import NPCInteraction

# Demo constants
SCREEN_W, SCREEN_H = 800, 600
BG_COLOR = (30, 30, 40)
HUD_COLOR = (220, 220, 220)
FONT_SIZE = 18
ASSET_DIR = os.path.join(ROOT, "assets")
SPRITE_SIZE = 64


def ensure_assets():
    os.makedirs(ASSET_DIR, exist_ok=True)

    player_path = os.path.join(ASSET_DIR, "player.png")
    npc_path = os.path.join(ASSET_DIR, "npc.png")
    ground_path = os.path.join(ASSET_DIR, "ground.png")

    return player_path, npc_path, ground_path


def generate_sprites(screen):
    # Create simple flat-style sprites (64x64) and save them to assets
    player_surf = pygame.Surface((SPRITE_SIZE, SPRITE_SIZE), pygame.SRCALPHA)
    npc_surf = pygame.Surface((SPRITE_SIZE, SPRITE_SIZE), pygame.SRCALPHA)
    ground_surf = pygame.Surface((SPRITE_SIZE, SPRITE_SIZE))

    # Ground: simple checker-ish tile
    ground_surf.fill((100, 150, 90))
    pygame.draw.rect(ground_surf, (90, 140, 80), (0, 0, SPRITE_SIZE // 2, SPRITE_SIZE // 2))
    pygame.draw.rect(ground_surf, (110, 160, 100), (SPRITE_SIZE // 2, SPRITE_SIZE // 2, SPRITE_SIZE // 2, SPRITE_SIZE // 2))

    # Player: round character with clothing
    player_surf.fill((0, 0, 0, 0))
    pygame.draw.circle(player_surf, (200, 160, 120), (SPRITE_SIZE // 2, SPRITE_SIZE // 2 - 6), 18)  # head / face
    pygame.draw.rect(player_surf, (50, 100, 200), (SPRITE_SIZE // 2 - 18, SPRITE_SIZE // 2 + 8, 36, 26))  # body
    pygame.draw.circle(player_surf, (0, 0, 0), (SPRITE_SIZE // 2 + 14, SPRITE_SIZE // 2 - 10), 3)  # eye

    # NPC: different color
    npc_surf.fill((0, 0, 0, 0))
    pygame.draw.circle(npc_surf, (120, 200, 160), (SPRITE_SIZE // 2, SPRITE_SIZE // 2 - 6), 16)
    pygame.draw.rect(npc_surf, (160, 110, 60), (SPRITE_SIZE // 2 - 16, SPRITE_SIZE // 2 + 8, 32, 24))

    # Save to files
    player_path, npc_path, ground_path = ensure_assets()
    try:
        pygame.image.save(player_surf, player_path)
        pygame.image.save(npc_surf, npc_path)
        pygame.image.save(ground_surf, ground_path)
    except Exception:
        # On some platforms saving may fail (permissions); ignore silently
        pass

    return player_surf, npc_surf, ground_surf


def load_or_generate_sprites(screen):
    player_path, npc_path, ground_path = ensure_assets()

    def try_load(path):
        try:
            return pygame.image.load(path).convert_alpha()
        except Exception:
            return None

    player_img = try_load(player_path)
    npc_img = try_load(npc_path)
    ground_img = try_load(ground_path)

    if player_img and npc_img and ground_img:
        return player_img, npc_img, ground_img

    # Otherwise generate and save
    return generate_sprites(screen)


def draw_text(surf, text, x, y, font, color=(255, 255, 255)):
    img = font.render(text, True, color)
    surf.blit(img, (x, y))


def distance(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def main():
    try:
        pygame.init()
    except Exception:
        print("pygame is required. Install with: pip install pygame")
        return

    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption("Freecity India - Pygame Demo (Sprites)")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("DejaVuSans", FONT_SIZE)

    # Load or generate sprites
    player_img, npc_img, ground_img = load_or_generate_sprites(screen)

    # Create player and position at center
    p = Player(name="Asha", character_class=PlayerClass.TRADER, player_id="player_pg_001")
    p.x = SCREEN_W // 2
    p.y = SCREEN_H // 2

    # Create a simple NPC
    npc = NPC(npc_id="npc_001", name="Ramu", npc_type=NPCType.MERCHANT, x=p.x + 120, y=p.y)

    npc_manager = NPCInteraction()

    running = True
    show_inventory_sample = False
    last_dialogue = ""
    dialogue_time = 0.0

    while running:
        dt = clock.tick(60) / 1000.0  # seconds

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_e:
                    # select earning method if not already
                    if not p.stats.has_selected_earning_method:
                        p.select_earning_method("street_vendor")
                    p.earn_money(100, method=p.stats.current_earning_method or "street_vendor", description="Quick demo")
                elif event.key == pygame.K_i:
                    # toggle a sample inventory item
                    if not show_inventory_sample:
                        p.inventory.add_item("samosa", 2)
                        show_inventory_sample = True
                    else:
                        p.inventory.remove_item("samosa", 2)
                        show_inventory_sample = False
                elif event.key == pygame.K_h:
                    p.take_damage(20)
                elif event.key == pygame.K_j:
                    p.stats.heal(15)
                elif event.key == pygame.K_SPACE:
                    # Interact if close
                    if distance((p.x, p.y), (npc.x, npc.y)) < 80:
                        res = npc_manager.interact_with_npc(p, npc, interaction_type="talk")
                        last_dialogue = res.get("message", "...")
                        dialogue_time = time.time()

        # Movement from pressed keys
        keys = pygame.key.get_pressed()
        dx = 0.0
        dy = 0.0
        if keys[pygame.K_w] or keys[pygame.K_UP]:
            dy -= 1.0
        if keys[pygame.K_s] or keys[pygame.K_DOWN]:
            dy += 1.0
        if keys[pygame.K_a] or keys[pygame.K_LEFT]:
            dx -= 1.0
        if keys[pygame.K_d] or keys[pygame.K_RIGHT]:
            dx += 1.0

        p.move(dx, dy)
        p.update(dt)

        # Keep player in screen bounds
        p.x = max(16, min(SCREEN_W - 16, p.x))
        p.y = max(16, min(SCREEN_H - 16, p.y))

        # Draw ground tiled
        for gx in range(0, SCREEN_W, SPRITE_SIZE):
            for gy in range(0, SCREEN_H, SPRITE_SIZE):
                screen.blit(ground_img, (gx, gy))

        # Draw NPC and player using sprites (centered)
        def blit_center(img, x, y):
            iw, ih = img.get_size()
            screen.blit(img, (int(x - iw / 2), int(y - ih / 2)))

        blit_center(npc_img, npc.x, npc.y)
        blit_center(player_img, p.x, p.y)

        # HUD
        hud_x = 8
        hud_y = 8
        draw_text(screen, f"Name: {p.name}  Class: {p.character_class.value}", hud_x, hud_y, font, HUD_COLOR)
        draw_text(screen, f"Health: {p.stats.health}/{p.stats.max_health}", hud_x, hud_y + 22, font, HUD_COLOR)
        draw_text(screen, f"Money: ₹{p.stats.money}", hud_x, hud_y + 44, font, HUD_COLOR)
        draw_text(screen, f"XP: {p.stats.experience}  Level: {p.stats.level}", hud_x, hud_y + 66, font, HUD_COLOR)
        draw_text(screen, f"Status: {p.get_status_string()}", hud_x, hud_y + 88, font, HUD_COLOR)

        # Dialogue box
        if last_dialogue and time.time() - dialogue_time < 3.5:
            # draw semi-transparent box
            box_w = 560
            box_h = 60
            box_x = (SCREEN_W - box_w) // 2
            box_y = SCREEN_H - box_h - 16
            s = pygame.Surface((box_w, box_h), pygame.SRCALPHA)
            s.fill((10, 10, 10, 200))
            screen.blit(s, (box_x, box_y))
            draw_text(screen, f"{npc.name}: {last_dialogue}", box_x + 8, box_y + 18, font, (240,240,240))

        # Instructions
        instr_x = 8
        instr_y = SCREEN_H - 120
        draw_text(screen, "Controls: WASD / Arrows - Move | SPACE - Talk | E - Earn ₹100 | I - Toggle samosa | H - Damage | J - Heal | ESC - Quit", instr_x, instr_y, font, HUD_COLOR)

        pygame.display.flip()

    pygame.quit()


if __name__ == '__main__':
    main()
