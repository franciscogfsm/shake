import { Screen, TestnetNote } from "@/components/ui";
import { UseCases, UseCasesEnd } from "@/components/UseCases";

export const metadata = { title: "SHAKE use cases", description: "A car on OLX, a flat deposit, a parcel, a night's crew. The money waits until you meet." };

export default function UseCasesPage() {
  return (
    <Screen wide back="/" right={<span className="eyebrow">Use cases</span>}>
      <UseCases />
      <UseCasesEnd />
      <TestnetNote className="mb-8" />
    </Screen>
  );
}
