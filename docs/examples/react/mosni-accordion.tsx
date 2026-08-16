import { Accordion, AccordionItem } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <Accordion exclusive>
      <AccordionItem summary="What is Mosni-Chrome?" defaultOpen>
        <p>The shared visual chrome for every app on the Hannah's stack.</p>
      </AccordionItem>
      <AccordionItem summary="How do I include it?">
        <p>Add one script tag to the page's head — see intro.</p>
      </AccordionItem>
    </Accordion>
  );
}
