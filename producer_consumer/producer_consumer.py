import random
import time
from threading import Thread, Semaphore
from sprites import *


# Constantes para el Productor-Consumidor
BUFF_SIZE = 22  # Límite del buffer
RUNNING = '!!!'
SLEEPING = 'zzz'  # Estados del productor/consumidor
TRYING = '...'


class Producer(Thread):
    def __init__(self, ship: ItemShip,
                 buffer: list, semaphore: Semaphore, speed: int,
                 group=None, target=None, name=None,
                 args=(), kwargs=None, verbose=None) -> None:
        super(Producer, self).__init__()

        self.daemon = True  # Daemon permite terminar el hilo al terminar el programa
        self.target = target
        self.name = name

        self.state = SLEEPING  # Inicia el estado dormido
        self.index = 0  # Índice de la posición del buffe
        self.ship = ship  # Sprite al que se actualiza la posición

        self.buffer = buffer
        self.semaphore = semaphore
        self.speed = speed

        self.steps = 0

    # Reimplementación del método run
    def run(self) -> None:
        while self.is_alive():
            self.state = TRYING  # Al momento de iniciar la iteración, el estado es 'intentando'
            self.semaphore.acquire()  # Espera la operación para empezar a producir

            # Una vez que obtiene el permiso para ejecutarse, pasa al estado 'corriendo'
            self.state = RUNNING
            self.steps = random.randrange(3, 7)
            for _ in range(self.steps):
                # Si el buffer esta lleno, sale del ciclo
                if len(self.buffer) == BUFF_SIZE:
                    break
                # De lo contrario, se encola el elemento en el buffer
                position = ITEM_POSITIONS[self.index]
                item = Item(position)
                self.buffer.append(item)
                # Actualiza el buffer y la posición del personaje productor
                self.ship.move(position)
                # Con el módulo, la estructura se vuelve circular
                self.index = (self.index + 1) % BUFF_SIZE
                # Se espera la cantidad de FPS definidos en speed, se divide en 1 porque son milisegundos
                time.sleep(1/self.speed)

            # Una vez termina de trabajar, se pasa al estado 'dormido'
            self.state = SLEEPING
            self.semaphore.release()  # Señal que permite al consumidor consumir
            # Tiempo aleatorio que pasa dormido el productor
            time.sleep(random.uniform(0.5, 1.5))


# Realiza básicamente las mismas operaciones que el productor
class Consumer(Thread):
    def __init__(self, character: Character,
                 buffer: list, semaphore: Semaphore, speed: int,
                 group=None, target=None, name=None,
                 args=(), kwargs=None, verbose=None) -> None:
        super(Consumer, self).__init__()
        self.daemon = True
        self.target = target
        self.name = name

        self.state = SLEEPING
        self.index = 0
        self.character = character

        self.buffer = buffer
        self.semaphore = semaphore
        self.speed = speed

        self.steps = 0

    def run(self) -> None:
        while self.is_alive():
            self.state = TRYING
            self.semaphore.acquire()

            self.state = RUNNING
            self.steps = random.randrange(3, 7)
            for _ in range(self.steps):
                # Se revisa que el buffer no esté vacío, si es así, sale del ciclo
                if not self.buffer:
                    break
                # De lo contrario, se retira el primer elemento del buffer
                self.buffer.pop(0)
                # Actualiza el buffer y la posición del personaje consumidor
                index_position = ITEM_POSITIONS[self.index]
                self.character.move(index_position)
                # Con el módulo, la estructura se vuelve circular
                self.index = (self.index + 1) % BUFF_SIZE
                time.sleep(1/self.speed)

            self.state = SLEEPING
            self.semaphore.release()
            time.sleep(random.uniform(0.5, 1.5))
