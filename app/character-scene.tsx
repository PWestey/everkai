import {openingCharacterScene} from '@/lib/opening-presentation.mjs';
import {Button} from '@/components/ui/button';import {sceneFor} from '@/lib/scenes.mjs';import {originalProfile} from '@/lib/original-catalog.mjs';
export default function CharacterScene({id,onRead,locked}:any){const scene=sceneFor(id)||openingCharacterScene(id);return scene?<Button variant="outline" disabled={locked} onClick={()=>onRead(scene.id)}>Read {originalProfile(id).name}’s encounter</Button>:null}
