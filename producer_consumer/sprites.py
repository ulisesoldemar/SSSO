import pygame
import pygame.freetype

# Constantes para los componentes de PyGame
BACKGROUND_COLOR = pygame.Color(223, 246, 245)
STEPS = 48
SPRITE_SIZE, ITEM_SIZE = 48, 36
SIZE = WIDTH, HEIGHT = 22*SPRITE_SIZE, 22*SPRITE_SIZE//2
ITEM_POSITIONS = [i for i in range(0, 22*SPRITE_SIZE, SPRITE_SIZE)]

class Character(pygame.sprite.Sprite):
    def __init__(self) -> None:
        super().__init__()
        # Agregando las imágenes al array de imágenes
        frame1 = pygame.image.load('assets/Characters/character_0000.png')
        frame1 = pygame.transform.flip(frame1, True, False)
        frame1 = pygame.transform.scale(frame1, (SPRITE_SIZE, SPRITE_SIZE))
        frame2 = pygame.image.load('assets/Characters/character_0001.png')
        frame2 = pygame.transform.flip(frame2, True, False)
        frame2 = pygame.transform.scale(frame2, (SPRITE_SIZE, SPRITE_SIZE))
        self.frames = [frame1, frame2]

        # Valor del índice para obtener la imagen del arreglo
        # inicialmente es 0
        self.frame = 0

        # La imagen que se mostrára será el índice del array de imágenes
        self.image = self.frames[self.frame]

        # Valor de los movimientos en x
        # incialmente es 0
        self.movex = 0

        # Creando un rectángulo en la posición x, y (0, ALTURA/2) de tamaño (48x48)
        # que es el tamaño del sprite
        self.rect = pygame.Rect(0, HEIGHT/2 - SPRITE_SIZE,
                                SPRITE_SIZE, SPRITE_SIZE)

    # Actualiza la posición en X del sprite
    def move(self, x) -> None:
        self.movex = x

    # Genera la animación del sprite
    def update(self) -> None:
        # Se actualiza la posición en X del sprite
        self.rect.x = self.movex
        # Para repetir los frames, se utiliza el módulo
        self.frame = (self.frame + 1) % len(self.frames)
        # Finalmente se actualiza la imagen del frame
        self.image = self.frames[self.frame]


# Es básicamente la misma clase del anterior, solo cambian los sprites
class ItemShip(Character):
    def __init__(self) -> None:
        super().__init__()
        frame1 = pygame.image.load('assets/Characters/character_0024.png')
        frame1 = pygame.transform.flip(frame1, True, False)
        frame1 = pygame.transform.scale(frame1, (SPRITE_SIZE, SPRITE_SIZE))
        frame2 = pygame.image.load('assets/Characters/character_0025.png')
        frame2 = pygame.transform.flip(frame2, True, False)
        frame2 = pygame.transform.scale(frame2, (SPRITE_SIZE, SPRITE_SIZE))
        frame3 = pygame.image.load('assets/Characters/character_0026.png')
        frame3 = pygame.transform.flip(frame3, True, False)
        frame3 = pygame.transform.scale(frame3, (SPRITE_SIZE, SPRITE_SIZE))

        self.frames = [frame1, frame2]

        self.frame = 0

        self.image = self.frames[self.frame]

        self.movex = 0

        self.rect = pygame.Rect(
            0, HEIGHT/2 - SPRITE_SIZE*2, SPRITE_SIZE, SPRITE_SIZE)


class Item(pygame.sprite.Sprite):
    def __init__(self, x_pos) -> None:
        super(Item, self).__init__()
        frame1 = pygame.image.load('assets/Tiles/tile_0151.png')
        frame1 = pygame.transform.scale(frame1, (ITEM_SIZE, ITEM_SIZE))
        frame2 = pygame.image.load('assets/Tiles/tile_0152.png')
        frame2 = pygame.transform.scale(frame2, (ITEM_SIZE, ITEM_SIZE))
        self.frames = [frame1, frame2]

        self.frame = 0

        self.image = self.frames[self.frame]

        self.rect = pygame.Rect(
            x_pos, HEIGHT/2 - ITEM_SIZE, ITEM_SIZE, ITEM_SIZE)

    def update(self) -> None:
        self.frame = (self.frame + 1) % len(self.frames)
        self.image = self.frames[self.frame]


class Tile(pygame.sprite.Sprite):
    def __init__(self, path: str, x_pos, y_pos) -> None:
        super(Tile, self).__init__()
        self.image = pygame.image.load(path)
        self.image = pygame.transform.scale(
            self.image, (SPRITE_SIZE, SPRITE_SIZE))
        self.rect = pygame.Rect(x_pos, y_pos, SPRITE_SIZE, SPRITE_SIZE)


class Button:
    def __init__(self,
                 color: pygame.Color,
                 x_pos, y_pos,
                 width, height,
                 text: str = '', font: pygame.freetype.Font = None) -> None:
        self.color = color
        self.x = x_pos
        self.y = y_pos
        self.width = width
        self.height = height
        self.text = text
        if font:
            self.font = font
        else:
            self.font = pygame.font.SysFont('comicsans', 16)

    # Con este método se dibuja el botón en pantalla
    def draw(self, screen, outline=None) -> None:
        if outline:
            pygame.draw.rect(screen, outline, (self.x-2, self.y -
                             2, self.width+4, self.height+4), 0)

        pygame.draw.rect(screen, self.color, (self.x, self.y,
                         self.width, self.height), 0)

        if self.text != '':
            text = self.font.render(self.text)
            self.font.render_to(screen, dest=(
                self.x + (self.width/2 - text[0].get_width()/2),
                self.y + (self.height/2 - text[0].get_height()/2)
            ), text=self.text, fgcolor=pygame.Color('black'))

    # pos es la posición del mouse un una tupla de coordenadas (x, y)
    def is_over(self, pos) -> bool:
        if pos[0] > self.x and pos[0] < self.x + self.width:
            if pos[1] > self.y and pos[1] < self.y + self.height:
                return True

        return False
