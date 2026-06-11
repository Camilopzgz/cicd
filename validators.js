// Middleware de validación para las tareas
const validateTask = (req, res, next) => {
  const { title, description } = req.body;
  
  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "El título es requerido y debe ser texto" });
  }
  
  if (title.length > 100) {
    return res.status(400).json({ error: "El título no debe exceder 100 caracteres" });
  }
  
  if (description && description.length > 500) {
    return res.status(400).json({ error: "La descripción no debe exceder 500 caracteres" });
  }
  
  next();
};

module.exports = { validateTask };
