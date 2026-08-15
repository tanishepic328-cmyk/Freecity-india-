#!/usr/bin/env python3
"""
Simple pygame demo for Freecity India Player
Save at the repository root and run:
  python3 demo_pygame.py

Controls:
  WASD / Arrow keys - move
  E - earn money (auto-select a method)
  I - add a sample item to inventory (toggle)
  H - take damage (simulate)
  J - heal
  ESC or close window - quit

Requires: pygame (pip install pygame)
"""
import sys
import os
import math
import pygame
from pygame import gfxdraw

# Make src importable
ROOT = os.path.dirname(__file__)
SRC = os.path.join(ROOT, "src")
if SRC not in sys.path:
    sys.path.insert(0, SRC)

from entities.player import Player, PlayerClass

# Demo constants
SCREEN_W, SCREEN_H = 800, 600
BG_COLOR = (30, 30, 40)
PLAYER_COLOR = (200, 160, 120)
HUD_COLOR = (220, 220, 220)
FONT_SIZE = 18


def draw_text(surf, text, x, y, font, color=(255,255,255)):
    img = font.render(text, True, color)
    surf.blit(img, (x, y))


def main():
    try:
        pygame.init()
    except Exception:
        print("pygame is required. Install with: pip install pygame")
        return

    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption("Freecity India - Pygame Demo")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont("DejaVuSans", FONT_SIZE)

    # Create player and position at center
    p = Player(name="Asha", character_class=PlayerClass.TRADER, player_id="player_pg_001")
    p.x = SCREEN_W // 2
    p.y = SCREEN_H // 2

    running = True
    show_inventory_sample = False

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

        # Draw
        screen.fill(BG_COLOR)

        # Draw player as a circle with a simple facing line
        px = int(p.x)
        py = int(p.y)
        radius = 16
        gfxdraw.filled_circle(screen, px, py, radius, PLAYER_COLOR)
        gfxdraw.aacircle(screen, px, py, radius, (0,0,0))

        # facing direction line
        fx = px + int(math.cos(p.direction) * radius * 1.5)
        fy = py + int(math.sin(p.direction) * radius * 1.5)
        pygame.draw.line(screen, (0,0,0), (px, py), (fx, fy), 2)

        # HUD
        hud_x = 8
        hud_y = 8
        draw_text(screen, f"Name: {p.name}  Class: {p.character_class.value}", hud_x, hud_y, font, HUD_COLOR)
        draw_text(screen, f"Health: {p.stats.health}/{p.stats.max_health}", hud_x, hud_y + 22, font, HUD_COLOR)
        draw_text(screen, f"Money: ₹{p.stats.money}", hud_x, hud_y + 44, font, HUD_COLOR)
        draw_text(screen, f"XP: {p.stats.experience}  Level: {p.stats.level}", hud_x, hud_y + 66, font, HUD_COLOR)
        draw_text(screen, f"Status: {p.get_status_string()}", hud_x, hud_y + 88, font, HUD_COLOR)

        # Instructions
        instr_x = 8
        instr_y = SCREEN_H - 120
        draw_text(screen, "Controls: WASD / Arrows - Move | E - Earn ₹100 | I - Toggle samosa | H - Damage | J - Heal | ESC - Quit", instr_x, instr_y, font, HUD_COLOR)

        pygame.display.flip()

    pygame.quit()


if __name__ == '__main__':
    main()
