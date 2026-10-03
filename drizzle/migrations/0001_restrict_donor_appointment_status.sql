DROP POLICY "appt update" ON public.appointments;

CREATE POLICY "appt update" ON public.appointments
FOR UPDATE TO authenticated
USING ((donor_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (donor_id = auth.uid() AND status IN ('agendado', 'cancelado'))
);