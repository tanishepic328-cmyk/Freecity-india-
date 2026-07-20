"""
Player Character System - Online Multiplayer Edition
Player stats, inventory, progression, no starting money
Multiple earning opportunities based on Indian livelihoods
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PlayerStatus(Enum):
    """Player status conditions"""
    HEALTHY = "healthy"
    INJURED = "injured"
    POISONED = "poisoned"
    HUNGRY = "hungry"
    TIRED = "tired"


class PlayerClass(Enum):
    """Player character classes"""
    WARRIOR = "warrior"
    ROGUE = "rogue"
    TRADER = "trader"
    SCHOLAR = "scholar"
    MYSTIC = "mystic"


@dataclass
class Skills:
    """Player skill attributes"""
    strength: int = 5
    dexterity: int = 5
    constitution: int = 5
    intelligence: int = 5
    wisdom: int = 5
    charisma: int = 5
    
    # Combat skills
    melee_combat: int = 0
    ranged_combat: int = 0
    unarmed_combat: int = 0
    
    # Non-combat skills
    trading: int = 0
    driving: int = 0
    hacking: int = 0
    persuasion: int = 0
    stealth: int = 0
    lockpicking: int = 0
    
    # Indian livelihood skills
    cooking: int = 0
    teaching: int = 0
    guiding: int = 0
    delivering: int = 0
    selling: int = 0
    customer_service: int = 0
    
    def get_skill_level(self, skill_name: str) -> int:
        """Get level of specific skill"""
        return getattr(self, skill_name, 0)
    
    def increase_skill(self, skill_name: str, amount: int = 1) -> None:
        """Increase skill level"""
        current = getattr(self, skill_name, 0)
        setattr(self, skill_name, min(current + amount, 100))
        logger.debug(f"Skill {skill_name} increased to {getattr(self, skill_name)}")


@dataclass
class Inventory:
    """Player inventory"""
    items: Dict[str, int] = field(default_factory=dict)
    max_weight: int = 100
    current_weight: int = 0
    equipped_weapon: Optional[str] = None
    equipped_armor: Optional[str] = None
    
    def add_item(self, item_name: str, quantity: int = 1) -> bool:
        """Add item to inventory"""
        if item_name in self.items:
            self.items[item_name] += quantity
        else:
            self.items[item_name] = quantity
        logger.debug(f"Added {quantity}x {item_name} to inventory")
        return True
    
    def remove_item(self, item_name: str, quantity: int = 1) -> bool:
        """Remove item from inventory"""
        if item_name not in self.items:
            return False
        
        if self.items[item_name] < quantity:
            return False
        
        self.items[item_name] -= quantity
        if self.items[item_name] == 0:
            del self.items[item_name]
        
        logger.debug(f"Removed {quantity}x {item_name} from inventory")
        return True
    
    def has_item(self, item_name: str, quantity: int = 1) -> bool:
        """Check if inventory has item"""
        return item_name in self.items and self.items[item_name] >= quantity
    
    def get_items_list(self) -> List[str]:
        """Get list of all items"""
        return list(self.items.keys())


@dataclass
class PlayerStats:
    """Player statistics - No starting money, earn through various methods"""
    health: int = 100
    max_health: int = 100
    hunger: int = 100
    max_hunger: int = 100
    energy: int = 100
    max_energy: int = 100
    experience: int = 0
    level: int = 1
    money: int = 0  # NO STARTING MONEY - EARN THROUGH VARIOUS METHODS
    wanted_level: int = 0  # Police wanted level
    
    # Earning method flags
    has_selected_earning_method: bool = False
    current_earning_method: Optional[str] = None
    total_earned: int = 0
    
    def take_damage(self, amount: int) -> int:
        """Take damage"""
        self.health = max(0, self.health - amount)
        logger.debug(f"Player took {amount} damage. Health: {self.health}")
        return self.health
    
    def heal(self, amount: int) -> int:
        """Heal player"""
        self.health = min(self.max_health, self.health + amount)
        logger.debug(f"Player healed {amount}. Health: {self.health}")
        return self.health
    
    def add_experience(self, amount: int) -> None:
        """Add experience and check for level up"""
        self.experience += amount
        experience_per_level = 1000
        
        new_level = self.experience // experience_per_level
        if new_level > self.level:
            self.level = new_level
            logger.info(f"Player leveled up to {self.level}")
            self.heal(20)  # Heal on level up
    
    def add_money(self, amount: int) -> None:
        """Add money"""
        self.money = max(0, self.money + amount)
        self.total_earned += amount
        logger.debug(f"Money: ${self.money} (Total: ${self.total_earned})")
    
    def spend_money(self, amount: int) -> bool:
        """Spend money"""
        if self.money >= amount:
            self.money -= amount
            return True
        return False


class Player:
    """Main player character class - Online Multiplayer Edition"""
    
    def __init__(self, name: str, character_class: PlayerClass, player_id: str):
        self.name = name
        self.character_class = character_class
        self.player_id = player_id  # Unique ID for multiplayer
        
        # Position and movement
        self.x: float = 0.0
        self.y: float = 0.0
        self.velocity_x: float = 0.0
        self.velocity_y: float = 0.0
        self.direction: float = 0.0  # Direction angle
        self.speed: float = 5.0
        
        # Camera/Look direction (mouse-controlled)
        self.camera_x: float = 0.0
        self.camera_y: float = 0.0
        self.look_distance: float = 100.0
        
        # Character data
        self.stats = PlayerStats()
        self.skills = Skills()
        self.inventory = Inventory()
        self.status: List[PlayerStatus] = []
        
        # Game state
        self.current_city: str = "Delhi"
        self.current_vehicle: Optional[str] = None
        self.is_in_combat: bool = False
        self.is_driving: bool = False
        
        # Multiplayer state
        self.is_local_player: bool = True
        self.last_update_time: float = 0.0
        
        # Appearance
        self.skin_color: str = "brown"
        self.hair_color: str = "black"
        self.clothing: str = "casual"
        
        # Mission/Earning Method tracking
        self.active_missions: List[Dict] = []
        self.completed_missions: List[Dict] = []
        self.earning_methods_completed: List[str] = []
        
        # Earnings tracking
        self.earning_history: List[Dict] = []
        
        logger.info(f"Player created: {name} ({character_class.value}) - ID: {player_id}")
        logger.info("Starting with ₹0 - Choose an earning method to make money")
    
    def update(self, dt: float) -> None:
        """Update player state"""
        # Update position
        self.x += self.velocity_x * self.speed * dt
        self.y += self.velocity_y * self.speed * dt
        
        # Update stats
        self._update_stats(dt)
        
        # Check status conditions
        self._check_status_conditions()
        
        # Update last seen time for multiplayer
        self.last_update_time += dt
    
    def _update_stats(self, dt: float) -> None:
        """Update player stats over time"""
        # Hunger decreases over time
        self.stats.hunger = max(0, self.stats.hunger - 0.05 * dt)
        
        # Energy decreases when moving
        if self.velocity_x != 0 or self.velocity_y != 0:
            self.stats.energy = max(0, self.stats.energy - 0.1 * dt)
        else:
            # Energy regenerates when stationary
            self.stats.energy = min(self.stats.max_energy, self.stats.energy + 0.05 * dt)
    
    def _check_status_conditions(self) -> None:
        """Check and update status conditions"""
        self.status.clear()
        
        if self.stats.health < 30:
            self.status.append(PlayerStatus.INJURED)
        
        if self.stats.hunger < 30:
            self.status.append(PlayerStatus.HUNGRY)
        
        if self.stats.energy < 20:
            self.status.append(PlayerStatus.TIRED)
    
    def move(self, direction_x: float, direction_y: float) -> None:
        """Set movement direction - Keyboard Controls (WASD)"""
        magnitude = (direction_x**2 + direction_y**2)**0.5
        if magnitude > 0:
            self.velocity_x = direction_x / magnitude
            self.velocity_y = direction_y / magnitude
        else:
            self.velocity_x = 0
            self.velocity_y = 0
    
    def look_at(self, mouse_x: float, mouse_y: float) -> None:
        """Set look direction based on mouse position"""
        self.camera_x = mouse_x
        self.camera_y = mouse_y
        
        # Calculate direction angle
        dx = mouse_x - self.x
        dy = mouse_y - self.y
        import math
        self.direction = math.atan2(dy, dx)
    
    def stop(self) -> None:
        """Stop player movement"""
        self.velocity_x = 0
        self.velocity_y = 0
    
    def attack(self) -> None:
        """Primary attack - Left mouse click"""
        logger.debug(f"Player {self.name} attacking")
        # Attack logic based on equipped weapon
    
    def secondary_action(self) -> None:
        """Secondary action - Right mouse click"""
        logger.debug(f"Player {self.name} performing secondary action")
    
    def interact(self) -> None:
        """Interact with objects/NPCs - Space bar"""
        logger.debug(f"Player {self.name} interacting")
    
    def use_item(self) -> None:
        """Use item - E key"""
        logger.debug(f"Player {self.name} using item")
    
    def take_damage(self, amount: int) -> None:
        """Player takes damage"""
        self.stats.take_damage(amount)
        if self.stats.health <= 0:
            self._on_death()
    
    def _on_death(self) -> None:
        """Handle player death"""
        logger.warning(f"Player {self.name} died")
        # Reset to hospital, lose some money, etc.
        self.stats.health = self.stats.max_health
        self.x = 0
        self.y = 0
        if self.stats.money > 0:
            self.stats.money = int(self.stats.money * 0.9)  # Lose 10% money
    
    def select_earning_method(self, method_type: str) -> bool:
        """Select an earning method (Taxi Driver, Delivery, Vendor, etc.)"""
        if self.stats.has_selected_earning_method:
            logger.info(f"Player already has earning method: {self.stats.current_earning_method}")
            return False
        
        self.stats.current_earning_method = method_type
        self.stats.has_selected_earning_method = True
        
        logger.info(f"Player {self.name} selected earning method: {method_type}")
        return True
    
    def earn_money(self, amount: int, method: str, description: str = "") -> None:
        """Earn money from various methods"""
        self.stats.add_money(amount)
        self.stats.add_experience(10)  # Small XP for earning
        
        # Log earning
        earning_record = {
            "method": method,
            "amount": amount,
            "description": description,
            "total_balance": self.stats.money
        }
        self.earning_history.append(earning_record)
        
        logger.info(f"Player earned ₹{amount} from {method}")
    
    def get_earning_opportunities(self) -> List[Dict]:
        """Get available earning opportunities"""
        opportunities = [
            {
                "id": "taxi_driver",
                "name": "Taxi Driver",
                "description": "Drive passengers around the city",
                "pay_per_task": "200-500 rupees",
                "skill": "driving"
            },
            {
                "id": "delivery_boy",
                "name": "Delivery Boy",
                "description": "Deliver food and packages",
                "pay_per_task": "150-300 rupees + tips",
                "skill": "delivering"
            },
            {
                "id": "street_vendor",
                "name": "Street Vendor",
                "description": "Sell goods in markets",
                "pay_per_task": "10% commission",
                "skill": "selling"
            },
            {
                "id": "tutor",
                "name": "Tutor",
                "description": "Teach children or adults",
                "pay_per_task": "500-1000 rupees per session",
                "skill": "teaching"
            },
            {
                "id": "security_guard",
                "name": "Security Guard",
                "description": "Guard shops, buildings, or events",
                "pay_per_task": "400 rupees daily",
                "skill": "strength"
            },
            {
                "id": "cook",
                "name": "Cook/Kitchen Helper",
                "description": "Work in restaurants or food stalls",
                "pay_per_task": "600 rupees daily",
                "skill": "cooking"
            },
            {
                "id": "tour_guide",
                "name": "Tour Guide",
                "description": "Guide tourists around landmarks",
                "pay_per_task": "800 rupees per tour + tips",
                "skill": "guiding"
            },
            {
                "id": "mechanic",
                "name": "Mechanic",
                "description": "Repair and maintain vehicles",
                "pay_per_task": "300-1000 rupees per job",
                "skill": "strength"
            },
            {
                "id": "construction",
                "name": "Construction Worker",
                "description": "Work on building sites",
                "pay_per_task": "500 rupees daily",
                "skill": "strength"
            },
            {
                "id": "street_performer",
                "name": "Street Performer",
                "description": "Entertain crowds and earn tips",
                "pay_per_task": "Variable (tips)",
                "skill": "charisma"
            }
        ]
        
        return opportunities
    
    def get_status_string(self) -> str:
        """Get player status string"""
        if not self.status:
            return "Healthy"
        return ", ".join([s.value.capitalize() for s in self.status])
    
    def get_info(self) -> Dict:
        """Get player information"""
        return {
            "name": self.name,
            "player_id": self.player_id,
            "class": self.character_class.value,
            "level": self.stats.level,
            "health": self.stats.health,
            "money": self.stats.money,
            "total_earned": self.stats.total_earned,
            "experience": self.stats.experience,
            "location": self.current_city,
            "status": self.get_status_string(),
            "position": (self.x, self.y),
            "current_earning_method": self.stats.current_earning_method,
            "active_missions": len(self.active_missions),
            "completed_missions": len(self.completed_missions)
        }
    
    def draw(self, screen) -> None:
        """Draw player on screen"""
        # Player rendering logic
        pass
