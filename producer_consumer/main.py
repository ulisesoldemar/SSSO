from producer_consumer import *


# Establece las posiciones de los tiles de adorno
def setup_bg() -> pygame.sprite.Group():
    group = pygame.sprite.Group()

    group.add(Tile('assets/Tiles/tile_0021.png',
              ITEM_POSITIONS[0], HEIGHT/2))
    for pos in ITEM_POSITIONS[1:-1]:
        bg_tile = Tile('assets/Tiles/tile_0022.png', pos, HEIGHT/2)
        group.add(bg_tile)
    group.add(Tile('assets/Tiles/tile_0023.png',
              ITEM_POSITIONS[-1], HEIGHT/2))

    for x in ITEM_POSITIONS:
        for y in range(HEIGHT//2+SPRITE_SIZE, HEIGHT, ITEM_SIZE):
            if x == ITEM_POSITIONS[0]:
                bg_tile = Tile('assets/Tiles/tile_0121.png', x, y)
            elif x == ITEM_POSITIONS[-1]:
                bg_tile = Tile('assets/Tiles/tile_0123.png', x, y)
            else:
                bg_tile = Tile('assets/Tiles/tile_0122.png', x, y)
            group.add(bg_tile)

    return group


def main() -> None:
    pygame.init()  # Se inicializan los componentes
    pygame.display.set_caption('Productor-Consumidor')  # Título de la ventana

    screen = pygame.display.set_mode(SIZE)  # Tamaño de la ventana
    font = pygame.freetype.Font('assets/Font/DisposableDroidBB_bld.ttf', 32)

    # Instancias de los personajes
    character = Character()
    ship = ItemShip()

    # Se agrupan los sprites
    character_group = pygame.sprite.Group(character, ship)
    floor_group = setup_bg()

    # Generación del botón
    button = Button(pygame.Color('gray'), WIDTH//2-SPRITE_SIZE,
                    HEIGHT//2+SPRITE_SIZE*2, SPRITE_SIZE*2, SPRITE_SIZE, 'START', font)

    # Control de FPS
    clock = pygame.time.Clock()

    # Variables para el Productor-Consumidor
    buffer = []  # Se inicia buffer vacío
    semaphore = Semaphore()  # Se inixializa el semáforo
    speed = 6  # Velocidad de la animación

    # Instancias de los hilos productor y consumidor
    producer = Producer(ship=ship, buffer=buffer,
                        semaphore=semaphore, speed=speed)
    consumer = Consumer(character=character, buffer=buffer,
                        semaphore=semaphore, speed=speed)

    while True:
        # Bandera para conocer el estado de los hilos
        started = producer.is_alive() and consumer.is_alive()

        # Eventos del juego
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                quit()

            if event.type == pygame.KEYDOWN:
                # Condicional para terminar el programa con ESC
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    quit()

            # Eventos del botón de incio
            if event.type == pygame.MOUSEBUTTONDOWN and not started:
                pos = pygame.mouse.get_pos()
                # Se inician los hilos al hacer click en el botón
                if button.is_over(pos):
                    producer.start()
                    consumer.start()

            if event.type == pygame.MOUSEMOTION and not started:
                pos = pygame.mouse.get_pos()
                if button.is_over(pos):
                    button.color = pygame.Color('darkgray')
                else:
                    button.color = pygame.Color('gray')

        # Se llena el color en la pantalla
        screen.fill(BACKGROUND_COLOR)

        # Se dibuja el piso
        floor_group.draw(screen)

        # Se dibujan los números de casillas
        for i in range(len(ITEM_POSITIONS)):
            if i < 9:
                padding = 16
            else:
                padding = 8
            font.render_to(
                screen, dest=(ITEM_POSITIONS[i]+padding, HEIGHT/2+ITEM_SIZE), text=str(i+1), fgcolor=(182, 213, 60))

        # El botón de incio sólo se dibuja cuando no ha comenzado la ejecución de los hilos
        if not started:
            button.draw(screen, pygame.Rect(0, 0, 8, 8))
        else:
            buffer_len = f'Buffer size: {len(buffer)}'
            text = font.render(buffer_len)
            font.render_to(screen, dest=(
                WIDTH - text[0].get_width() - 64, 16), text=buffer_len, fgcolor=pygame.Color('black'))

            if producer.state == RUNNING:
                producer_state = f'Producer: running ({producer.steps})'
            elif producer.state == SLEEPING:
                producer_state = 'Producer: sleeping'
            elif producer.state == TRYING:
                producer_state = 'Producer: trying'
            text = font.render(producer_state)
            font.render_to(screen, dest=(64, 16),
                           text=producer_state, fgcolor=pygame.Color('black'))

            if consumer.state == RUNNING:
                consumer_state = f'Consumer: running ({consumer.steps})'
            elif consumer.state == SLEEPING:
                consumer_state = 'Consumer: sleeping'
            elif consumer.state == TRYING:
                consumer_state = 'Consumer: trying'
            text = font.render(consumer_state)
            font.render_to(screen, dest=(64, 48),
                           text=consumer_state, fgcolor=pygame.Color('black'))

            item_group = pygame.sprite.Group(buffer)
            item_group.update()
            item_group.draw(screen)

            character_group.update()
            character_group.draw(screen)

            font.render_to(screen, ship.rect.topright,
                           f'{producer.state}', pygame.Color('black'))
            font.render_to(screen, character.rect.topright,
                           f'{consumer.state}', pygame.Color('black'))

        pygame.display.update()

        clock.tick(speed)


if __name__ == '__main__':
    main()
