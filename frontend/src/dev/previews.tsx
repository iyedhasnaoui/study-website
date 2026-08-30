import {ComponentPreview, Previews} from "@react-buddy/ide-toolbox";
import {PaletteTree} from "./palette";
import {ForumPage} from "../features/forum/ForumPage.tsx";

const ComponentPreviews = () => {
    return (
        <Previews palette={<PaletteTree/>}>
            <ComponentPreview path="/ForumPage">
                <ForumPage/>
            </ComponentPreview>
        </Previews>
    );
};

export default ComponentPreviews;