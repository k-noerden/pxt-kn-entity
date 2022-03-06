/**
 * Entity system for sprites
 * For working with events and animations, and state
 * Inspired by / based on
 * https://github.com/microsoft/arcade-character-animations
 * https://github.com/riknoll/character-animations
 */
//% weight=100 color="#03AA74" weight=100 icon="\uf11b" block="KN Entity"
//% groups='["KNEntity"]'
namespace kn_entity {
    let entityScene: EntityScene; // Current EntityScene
    let entitySceneStack: EntityScene[]; // old EntityScene

    class EntityScene {
        public eventHandlers: any; // Map<Event, Map<Kind, handler>>
        // Note, an alternative way would be to construct an obj/map Map<Sprite.id, EntityState> then we can filter with `delete`

        // For both of the following states we need to be able to loop over the elements and look them up.
        // The only way to make a (fast) lookup in makecode is with an object (or at least i assume it is a hashtable.
        // But the only way to iterate over it is using Object.keys() which will allocate a new Array each time.
        // (Neither `For ... in` or `Object.entries` work)
        // That would be wasteful in a performancecritical path, so I use both an object for lookup and an Array for iteration
        // Both must be kept in sync!!!
        public entityStates: EntityState[];
        public animations: any; // Map<Sprite.id, Animation>

        public entityStateArr: EntityState[];
        public entityStateMap: any; // Map<Sprite.id, Animation>
        public animationArr: Animation[];
        public animationMap: any; // Map<Sprite.id, Animation>

        constructor() {
            this.eventHandlers = {};
            this.entityStates = [];
            this.animationArr = [];
            this.animationMap = {};
            let priority = scene.UPDATE_PRIORITY;
            game.currentScene().eventContext.registerFrameHandler(priority, () => this.update());
            priority = scene.ANIMATION_UPDATE_PRIORITY
            game.currentScene().eventContext.registerFrameHandler(priority, () => this.animate());
        }
        public update() {
            const dt = game.currentScene().eventContext.deltaTimeMillis;
            let cleanup = false;
            for (let entityState of this.entityStateArr) {
                if (entityState.sprite.flags & sprites.Flag.Destroyed) {
                    cleanup = true;
                } else {
                    entityState.update(dt);
                }
            }
            if (cleanup) {
                this.entityStateArr = this.entityStateArr.filter(function (entityState) {
                    if (entityState.sprite.flags & sprites.Flag.Destroyed) {
                        delete this.entityStatmap[entityState.sprite.id];
                        return false;
                    } else {
                        return true;
                    }
                });
            }

        }

        public animate() {
            const dt = game.currentScene().eventContext.deltaTimeMillis;
            let cleanup = false;
            for (let animation of this.animationArr) {
                if (animation.sprite.flags & sprites.Flag.Destroyed) {
                    cleanup = true;
                } else {
                    animation.animate(dt);
                }
            }
            if (cleanup) {
                this.animationArr = this.animationArr.filter(function (animation) {
                    if (animation.sprite.flags & sprites.Flag.Destroyed) {
                        delete this.animationObj[animation.sprite.id];
                        return false;
                    } else {
                        return true;
                    }
                });
            }
        }

        public getAnimation(sprite: Sprite): Animation {
            // let animation = this.animations[sprite.id];
            // if (!animation) {
            //     animation = new Animation(sprite);
            //     this.animations[sprite.id] = animation;
            // }
            // return animation
            let animation = this.animationMap[sprite.id];
            if (!animation) {
                animation = new Animation(sprite);
                this.animationMap[sprite.id] = animation;
                this.animationArr.push(animation);
            }
            return animation;
        }
    }
    function initScene() {
        if (!entitySceneStack) {
            entitySceneStack = []
        } else {
            entitySceneStack.push(entityScene);
        }
        entityScene = new EntityScene();
    }
    initScene();
    game.addScenePushHandler(initScene);
    game.addScenePopHandler(function (oldScene) {
        control.assert(entitySceneStack.length > 0, 800);
        entityScene = entitySceneStack.pop();
    });
















    enum StateEnum {
        Nothing,
        North,
        East,
        South,
        West,
    }
    class EntityState {
        public sprite: Sprite;
        private lastX: number;
        private lastY: number;
        private lastMovement: StateEnum;
        public lastEvent: EventKind;

        constructor (sprite: Sprite) {
            this.sprite = sprite;
            this.lastX = sprite.x;
            this.lastY = sprite.y;
            this.lastMovement = StateEnum.Nothing;
        }
        public update(dt: number) {
            let vx = this.sprite.vx;
            let vy = this.sprite.vy;
            // if (!(vx | vy)) {
            //     vx = this.sprite.x - this.lastX;
            //     vy = this.sprite.y - this.lastY;
            // }
            let event = this._pickMovement(vx, vy);
            if (event !== this.lastEvent) {
                this.lastEvent = event;
                triggerEvent(this.sprite, event);
            }
            this.lastX = this.sprite.x;
            this.lastY = this.sprite.y;
        }

        private _pickMovement(vx: number, vy: number) {
            let event;
            if (vx || vy) {
                // Moving
                let vxAbs = vx >= 0? vx : -vx;
                let vyAbs = vy >= 0? vy : -vy;
                let delta = vxAbs - vyAbs;
                if (delta < -1 || delta > 1) {
                    // One direction is dominating
                    if (vxAbs > vyAbs) {
                        if (vx > 0) {
                            event = EventKind.MovingEast;
                            this.lastMovement = StateEnum.East;
                        } else {
                            event = EventKind.MovingWest;
                            this.lastMovement = StateEnum.West;
                        }
                    } else {
                        if (vy > 0) {
                            event = EventKind.MovingSouth;
                            this.lastMovement = StateEnum.South;
                        } else {
                            event = EventKind.MovingNorth;
                            this.lastMovement = StateEnum.North;

                        }
                    }
                } else {
                    if (false) {
                    } else if (vx > 0 && this.lastMovement === StateEnum.East) {
                        event = EventKind.MovingEast;
                        this.lastMovement = StateEnum.East;
                    } else if (vx < 0 && this.lastMovement === StateEnum.West) {
                        event = EventKind.MovingWest;
                        this.lastMovement = StateEnum.West;
                    } else if (vy > 0 && this.lastMovement === StateEnum.South) {
                        event = EventKind.MovingSouth;
                        this.lastMovement = StateEnum.South;
                    } else if (vy < 0 && this.lastMovement === StateEnum.North) {
                        event = EventKind.MovingNorth;
                        this.lastMovement = StateEnum.North;
                    } else if (vx > 0) {
                        event = EventKind.MovingEast;
                        this.lastMovement = StateEnum.East;
                    } else if (vx < 0) {
                        event = EventKind.MovingWest;
                        this.lastMovement = StateEnum.West;
                    } else if (vy > 0) {
                        event = EventKind.MovingSouth;
                        this.lastMovement = StateEnum.South;
                    } else if (vy < 0) {
                        event = EventKind.MovingNorth;
                        this.lastMovement = StateEnum.North;
                    }
                }
            } else {
                // Standing
                switch (this.lastMovement) {
                    case StateEnum.Nothing: break;
                    case StateEnum.North: event = EventKind.StandingNorth; break;
                    case StateEnum.East: event = EventKind.StandingEast; break;
                    case StateEnum.South: event = EventKind.StandingSouth; break;
                    case StateEnum.West: event = EventKind.StandingWest; break;
                }
            }
            return event;
        }
    }

    /**
     * Register an event handler for a given sprite kind and event
     */
    //% draggableParameters="reporter"
    //% blockId=kn_entity_eventHandler
    //% block="on $sprite of kind %kind=spritekind on event $event=kn_entity_enumShim"
    //% group="Events"
    export function eventHandler(kind: number, event: number, handler: (sprite: Sprite) => void) {
        let eventMap = entityScene.eventHandlers[event];
        if (!eventMap) {
            eventMap = {};
            entityScene.eventHandlers[event] = eventMap;
        }
        eventMap[kind] = handler;
    }

    /**
     * Trigger an event on a specific sprite
     * Will run event handler immediately before continueing
     */
    //% blockId=kn_entity_triggerEvent
    //% block="Trigger event $sprite=variables_get(mySprite) $event=kn_entity_enumShim"
    //% group="Events"
    export function triggerEvent(sprite: Sprite, event: number) {
        let eventMap = entityScene.eventHandlers[event];
        if (!eventMap) {
            console.log("No event handler registered for event");
            return;
        }
        let handler = eventMap[sprite.kind()];
        if (!handler) {
            console.log("No event handler registered for kind");
            return;
        }
        handler(sprite);

    }

    /**
     * Set up automatic state tracker that generates events for sprite
     */
    //% blockId=kn_entity_autoEvent
    //% block="Auto events on %sprite=variables_get(mySprite)"
    //% group="Events"
    export function autoEvent(sprite: Sprite) {
        if (entityScene.entityStateMap[sprite.id]) {
            return; // An EntityState is already created;
        }
        let entityState = new EntityState(sprite);
        entityScene.entityStateMap[sprite.id] = entityState;
        entityScene.entityStateList.push(entityState);
    }

    //% shim=ENUM_GET
    //% blockId=kn_entity_enumShim
    //% block="%arg"
    //% enumName="EventKind"
    //% enumMemberName="event"
    //% enumPromptHint="eg. MovingEast, StandingSouth"
    //% enumInitialMembers="MovingNorth, MovingEast, MovingSouth, MovingWest, StandingNorth, StandingEast, StandingSouth, StandingWest"
    //% group="Events"
    export function enumShim(arg: number) {
        return arg;
    }


    /**
     * Latest AutoEvent
     */
    //%blockId=kn_entity_latestAutoEvent
    //%block="Latest auto event of $sprite=variables_get(mySprite)"
    //group="Events"
    export function latestAutoEvent(sprite: Sprite): EventKind {
        let entityState = entityScene.entityStateMap[sprite.id];
        if (!entityState) {
            return undefined;
        }
        return entityState.lastEvent;
    }






















    class Animation {
        public sprite: Sprite;
        private loopFrames: Image[];
        private loopInterval: number;
        private singleFrames: Image[];
        private singleInterval: number;
        private frame: number;
        private timer: number; // counts how much time is "unused" deltatime adds time, frames "uses" time

        constructor (sprite: Sprite) {
            this.sprite = sprite;
            this.frame = -1;
            this.loopFrames = null;
            this.singleFrames = null;
        }

        public animate(dt: number) {
            this.timer += dt;
            if (this.singleFrames) {
                let lastFrame = this.frame;
                if (this.frame == -1) {
                    // To handle new animations
                    this.frame = 0;
                }
                while (this.timer >= this.singleInterval) {
                    this.timer -= this.singleInterval;
                    this.frame++;
                }
                if (this.frame >= this.singleFrames.length) {
                    // Single is over
                    this.timer = 0;
                    this.frame = -1;
                    this.singleFrames = null;
                } else {
                    // Play frame
                    if (this.frame != lastFrame) {
                        let image = this.singleFrames[this.frame];
                        this.sprite.setImage(image);
                    }
                    return; // Nothing more to do
                }
            }
            if (this.loopFrames) {
                let lastFrame = this.frame;
                if (this.frame == -1) {
                    // To handle new animations
                    this.frame = 0;
                }
                while (this.timer >= this.loopInterval) {
                    this.timer -= this.loopInterval;
                    this.frame = (this.frame + 1) % this.loopFrames.length;
                }
                if (this.frame != lastFrame) {
                    let image = this.loopFrames[this.frame];
                    this.sprite.setImage(image);
                }
            }
        }

        public setLoop(frames: Image[], frameInterval: number) {
            this.loopFrames = frames;
            this.loopInterval = frameInterval;
            if (!this.singleFrames) {
                // We should only abort looping animations, not singles
                this.frame = -1;
                this.timer = 0;
            }

        }
        public setSingle(frames: Image[], frameInterval: number) {
            this.singleFrames = frames;
            this.singleInterval = frameInterval;
            this.frame = -1;
            this.timer = 0;

        }
        public stopAll() {
            this.loopFrames = null;
            this.singleFrames = null;
        }

        public stopLoop() {
            this.loopFrames = null;
        }
    }


    /**
     * Animate sprite with a loop
     * @param sprite The sprite to animate
     * @param frames The frames of the animation
     * @param frameInterval The amount of time to spend on each frame in milliseconds, eg: 250
     */
    //% blockId=kn_entity_animateLoop
    //% block="Animate $sprite=variables_get(mySprite) loop frames $frames=animation_editor interval $frameInterval=timePicker"
    //% group="Animation"
    export function animateLoop(sprite: Sprite, frames: Image[], frameInterval: number) {
        let animation = entityScene.getAnimation(sprite);
        animation.setLoop(frames, frameInterval);
    }

    /**
     * Animate sprite with a single
     * @param sprite The sprite to animate
     * @param frames The frames of the animation
     * @param frameInterval The amount of time to spend on each frame in milliseconds, eg: 250
     */
    //% blockId=kn_entity_animateSingle
    //% block="Animate $sprite=variables_get(mySprite) single run frames $frames=animation_editor interval $frameInterval=timePicker"
    //% group="Animation"
    export function animateSingle(sprite: Sprite, frames: Image[], frameInterval: number) {
        let animation = entityScene.getAnimation(sprite);
        animation.setSingle(frames, frameInterval);
    }


    export enum StopEnum {
        //% block="All"
        All,
        //% block="Loop"
        Loop,
    }
    /**
     * Stop animations on sprite
     * @param sprite The sprite to stop animations on
     * @param what What kinds of animations to stop
     */
    //% blockId=kn_entity_stopAnimation
    //% block="Stop animations on $sprite=variables_get(mySprite) $what"
    //% group="Animation"
    export function stopAnimation(sprite: Sprite, what: StopEnum) {
        let animation = entityScene.getAnimation(sprite);
        if (what === StopEnum.All) {
            animation.stopAll();
        } else if (what === StopEnum.Loop) {
            animation.stopLoop();
        }
    }


}
