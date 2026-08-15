"""
Minimal NPC class and supporting enums for demo usage.
"""
from dataclasses import dataclass
from enum import Enum
import math
from typing import Optional


class NPCType(Enum):
    WORKER = "worker"
    RESIDENT = "resident"
    MERCHANT = "merchant"
    CRIMINAL = "criminal"
    TOURIST = "tourist"


class NPCAIState(Enum):
    IDLE = 0
    MOVING = 1
    EATING = 2
    FLEEING = 3


class DailyRoutine:
    def get_current_activity(self, hour: int) -> str:
        # Very simple routine for demo
        if 8 <= hour <= 17:
            return "working"
        if 18 <= hour <= 20:
            return "eating"
        return "sleeping"


@dataclass
class NPCStats:
    hunger: int = 100


class NPC:
    def __init__(self, npc_id: str, name: str, npc_type: NPCType, x: float = 0.0, y: float = 0.0):
        self.npc_id = npc_id
        self.name = name
        self.npc_type = npc_type
        self.x = x
        self.y = y
        self.earning_method: Optional[str] = None
        self.current_job = None
        self.stats = NPCStats()
        self.ai = type("AI", (), {"current_state": NPCAIState.IDLE})()
        self.daily_routine = DailyRoutine()
        self.friends = []
        self.enemies = []

    def move_towards(self, tx: float, ty: float, speed: float = 1.0):
        dx = tx - self.x
        dy = ty - self.y
        dist = math.hypot(dx, dy)
        if dist > 0:
            self.x += (dx / dist) * speed
            self.y += (dy / dist) * speed
            self.ai.current_state = NPCAIState.MOVING

    def stop(self):
        self.ai.current_state = NPCAIState.IDLE

    def start_work(self):
        self.current_job = "work"

    def eat(self):
        self.stats.hunger = min(100, self.stats.hunger + 20)

    def rest(self):
        pass

    def socialize_with_player(self, player_name: str) -> str:
        return f"Hello {player_name}, nice to see you!"

    def draw(self, screen) -> None:
        try:
            import pygame
            from pygame import gfxdraw
        except Exception:
            return

        px = int(self.x)
        py = int(self.y)
        radius = 12
        color = (120, 200, 160)
        try:
            gfxdraw.filled_circle(screen, px, py, radius, color)
            gfxdraw.aacircle(screen, px, py, radius, (0, 0, 0))
        except Exception:
            pygame.draw.circle(screen, color, (px, py), radius)
            pygame.draw.circle(screen, (0, 0, 0), (px, py), radius, 1)

        try:
            font = pygame.font.SysFont("DejaVuSans", 12)
            name_surf = font.render(self.name, True, (240, 240, 240))
            screen.blit(name_surf, (px - name_surf.get_width() // 2, py - radius - 14))
        except Exception:
            pass
