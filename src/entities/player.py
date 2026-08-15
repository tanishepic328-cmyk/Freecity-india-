@@
     def draw(self, screen) -> None:
         """Draw player on screen"""
-        # Player rendering logic
-        pass
+        # Lazy import pygame so core logic doesn't require it at import time
+        try:
+            import pygame
+        except Exception:
+            return
+
+        px = int(self.x)
+        py = int(self.y)
+        radius = 16
+
+        # Map simple skin_color to RGB (extend as needed)
+        color_map = {
+            "brown": (200, 160, 120),
+            "black": (30, 30, 30),
+            "white": (240, 240, 240),
+        }
+        player_color = color_map.get(self.skin_color, (200, 160, 120))
+
+        # Draw filled circle for player
+        try:
+            from pygame import gfxdraw
+            gfxdraw.filled_circle(screen, px, py, radius, player_color)
+            gfxdraw.aacircle(screen, px, py, radius, (0, 0, 0))
+        except Exception:
+            pygame.draw.circle(screen, player_color, (px, py), radius)
+            pygame.draw.circle(screen, (0, 0, 0), (px, py), radius, 1)
+
+        # Facing direction line
+        fx = px + int(math.cos(self.direction) * radius * 1.5)
+        fy = py + int(math.sin(self.direction) * radius * 1.5)
+        pygame.draw.line(screen, (0, 0, 0), (px, py), (fx, fy), 2)
+
+        # Draw name above the player if font is available on the screen object
+        try:
+            font = pygame.font.SysFont("DejaVuSans", 14)
+            name_surf = font.render(self.name, True, (240, 240, 240))
+            screen.blit(name_surf, (px - name_surf.get_width() // 2, py - radius - 18))
+        except Exception:
+            pass
