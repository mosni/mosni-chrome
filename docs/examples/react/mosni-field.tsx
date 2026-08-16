import { Field } from "../../../packages/react/src/index";

export default function Example() {
  return (
    <>
      <Field
        label="Email"
        type="email"
        required
        help="We'll never share your email."
      />
      <Field label="Display name">
        <input type="text" placeholder="Jane Doe" />
      </Field>
      <Field
        label="Email"
        type="email"
        defaultValue="not-an-email"
        error="Enter a valid email address."
      />
    </>
  );
}
